"""
Model Wrappers for Custom Tracing

Provides easy-to-use wrapper classes for tracing any LLM model.
Use these wrappers to automatically capture:
- Token usage
- Latency
- Model metadata
- System instructions
- Input/Output
"""
from typing import Any, Dict, Optional, List, Callable, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import time

from .tracing import (
    trace_span,
    async_trace_span,
    SpanType,
    TokenUsage,
    estimate_token_usage,
    count_tokens
)


@dataclass
class ModelResponse:
    """Standardized response from any model wrapper"""
    content: str
    model_name: str
    token_usage: TokenUsage
    latency_ms: float
    raw_response: Optional[Any] = None
    metadata: Optional[Dict[str, Any]] = None


class BaseModelWrapper(ABC):
    """
    Abstract base class for model wrappers.
    
    Extend this class to add tracing to any custom model.
    Example:
        class MyCustomModelWrapper(BaseModelWrapper):
            def __init__(self, model):
                super().__init__(
                    model_name="my-custom-model",
                    model_provider="custom"
                )
                self.model = model
            
            def _call_model(self, prompt, **kwargs):
                return self.model.generate(prompt)
            
            def _extract_content(self, response):
                return response.text
    """
    
    def __init__(
        self,
        model_name: str,
        model_provider: str = "custom",
        default_system_instruction: Optional[str] = None
    ):
        self.model_name = model_name
        self.model_provider = model_provider
        self.default_system_instruction = default_system_instruction
    
    @abstractmethod
    def _call_model(self, prompt: str, **kwargs) -> Any:
        """
        Override this method to call your model.
        
        Args:
            prompt: The user prompt
            **kwargs: Additional arguments for your model
            
        Returns:
            Raw model response
        """
        pass
    
    @abstractmethod
    def _extract_content(self, response: Any) -> str:
        """
        Override this method to extract text content from model response.
        
        Args:
            response: Raw model response
            
        Returns:
            Text content
        """
        pass
    
    def _extract_token_usage(self, response: Any, prompt: str, content: str) -> TokenUsage:
        """
        Override this method if your model provides token counts.
        Default implementation estimates tokens.
        
        Args:
            response: Raw model response
            prompt: Original prompt
            content: Extracted content
            
        Returns:
            TokenUsage object
        """
        return estimate_token_usage(
            prompt=prompt,
            completion=content,
            model_name=self.model_name,
            system_prompt=self.default_system_instruction
        )
    
    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        span_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> ModelResponse:
        """
        Generate a response with full tracing.
        
        Args:
            prompt: User prompt
            system_instruction: Override system instruction
            span_name: Custom span name (defaults to model_name)
            metadata: Additional metadata to include in span
            **kwargs: Passed to _call_model
            
        Returns:
            ModelResponse with content, tokens, and latency
        """
        system = system_instruction or self.default_system_instruction
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        
        with trace_span(
            name=span_name or f"{self.model_name}_generate",
            span_type=SpanType.LLM,
            model_name=self.model_name,
            model_provider=self.model_provider,
            system_instruction=system,
            metadata=metadata or {}
        ) as span:
            start_time = time.time()
            
            span.input_data = {
                "prompt": prompt[:500],
                "system_instruction": system[:200] if system else None
            }
            
            try:
                raw_response = self._call_model(prompt, **kwargs)
                content = self._extract_content(raw_response)
                token_usage = self._extract_token_usage(raw_response, full_prompt, content)
                
                latency_ms = (time.time() - start_time) * 1000
                
                span.output_data = content[:500] if len(content) > 500 else content
                span.token_usage = token_usage
                
                return ModelResponse(
                    content=content,
                    model_name=self.model_name,
                    token_usage=token_usage,
                    latency_ms=latency_ms,
                    raw_response=raw_response,
                    metadata={"system_instruction": system} if system else None
                )
                
            except Exception as e:
                span.error = str(e)
                span.error_type = type(e).__name__
                raise


class AsyncBaseModelWrapper(ABC):
    """
    Async version of BaseModelWrapper for async model calls.
    """
    
    def __init__(
        self,
        model_name: str,
        model_provider: str = "custom",
        default_system_instruction: Optional[str] = None
    ):
        self.model_name = model_name
        self.model_provider = model_provider
        self.default_system_instruction = default_system_instruction
    
    @abstractmethod
    async def _call_model(self, prompt: str, **kwargs) -> Any:
        """Override this method to call your async model."""
        pass
    
    @abstractmethod
    def _extract_content(self, response: Any) -> str:
        """Override this method to extract text content."""
        pass
    
    def _extract_token_usage(self, response: Any, prompt: str, content: str) -> TokenUsage:
        """Override if your model provides token counts."""
        return estimate_token_usage(
            prompt=prompt,
            completion=content,
            model_name=self.model_name,
            system_prompt=self.default_system_instruction
        )
    
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        span_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> ModelResponse:
        """Generate a response with full tracing (async)."""
        system = system_instruction or self.default_system_instruction
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        
        async with async_trace_span(
            name=span_name or f"{self.model_name}_generate",
            span_type=SpanType.LLM,
            model_name=self.model_name,
            model_provider=self.model_provider,
            system_instruction=system,
            metadata=metadata or {}
        ) as span:
            start_time = time.time()
            
            span.input_data = {
                "prompt": prompt[:500],
                "system_instruction": system[:200] if system else None
            }
            
            try:
                raw_response = await self._call_model(prompt, **kwargs)
                content = self._extract_content(raw_response)
                token_usage = self._extract_token_usage(raw_response, full_prompt, content)
                
                latency_ms = (time.time() - start_time) * 1000
                
                span.output_data = content[:500] if len(content) > 500 else content
                span.token_usage = token_usage
                
                return ModelResponse(
                    content=content,
                    model_name=self.model_name,
                    token_usage=token_usage,
                    latency_ms=latency_ms,
                    raw_response=raw_response,
                    metadata={"system_instruction": system} if system else None
                )
                
            except Exception as e:
                span.error = str(e)
                span.error_type = type(e).__name__
                raise


# ============================================================================
# Pre-built Wrappers for Popular Models
# ============================================================================

class OpenAIWrapper(BaseModelWrapper):
    """
    Wrapper for OpenAI models with automatic tracing.
    
    Example:
        from openai import OpenAI
        
        client = OpenAI()
        wrapper = OpenAIWrapper(client, model="gpt-4")
        
        response = wrapper.generate("Hello, how are you?")
        print(response.content)
        print(f"Tokens used: {response.token_usage.total_tokens}")
    """
    
    def __init__(
        self,
        client,
        model: str = "gpt-4",
        default_system_instruction: Optional[str] = None
    ):
        super().__init__(
            model_name=model,
            model_provider="openai",
            default_system_instruction=default_system_instruction
        )
        self.client = client
        self.model = model
    
    def _call_model(self, prompt: str, **kwargs) -> Any:
        messages = []
        if self.default_system_instruction:
            messages.append({"role": "system", "content": self.default_system_instruction})
        messages.append({"role": "user", "content": prompt})
        
        return self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            **kwargs
        )
    
    def _extract_content(self, response: Any) -> str:
        return response.choices[0].message.content or ""
    
    def _extract_token_usage(self, response: Any, prompt: str, content: str) -> TokenUsage:
        if hasattr(response, 'usage') and response.usage:
            return TokenUsage(
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_tokens=response.usage.total_tokens
            )
        return super()._extract_token_usage(response, prompt, content)


class AnthropicWrapper(BaseModelWrapper):
    """
    Wrapper for Anthropic Claude models with automatic tracing.
    
    Example:
        from anthropic import Anthropic
        
        client = Anthropic()
        wrapper = AnthropicWrapper(client, model="claude-3-opus-20240229")
        
        response = wrapper.generate("Hello!")
    """
    
    def __init__(
        self,
        client,
        model: str = "claude-3-sonnet-20240229",
        default_system_instruction: Optional[str] = None
    ):
        super().__init__(
            model_name=model,
            model_provider="anthropic",
            default_system_instruction=default_system_instruction
        )
        self.client = client
        self.model = model
    
    def _call_model(self, prompt: str, **kwargs) -> Any:
        kwargs_final = {"max_tokens": kwargs.pop("max_tokens", 1024)}
        kwargs_final.update(kwargs)
        
        if self.default_system_instruction:
            kwargs_final["system"] = self.default_system_instruction
        
        return self.client.messages.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            **kwargs_final
        )
    
    def _extract_content(self, response: Any) -> str:
        return response.content[0].text if response.content else ""
    
    def _extract_token_usage(self, response: Any, prompt: str, content: str) -> TokenUsage:
        if hasattr(response, 'usage') and response.usage:
            return TokenUsage(
                prompt_tokens=response.usage.input_tokens,
                completion_tokens=response.usage.output_tokens,
                total_tokens=response.usage.input_tokens + response.usage.output_tokens
            )
        return super()._extract_token_usage(response, prompt, content)


class GeminiWrapper(BaseModelWrapper):
    """
    Wrapper for Google Gemini models with automatic tracing.
    
    Example:
        import google.generativeai as genai
        
        genai.configure(api_key="...")
        model = genai.GenerativeModel('gemini-pro')
        wrapper = GeminiWrapper(model)
        
        response = wrapper.generate("Hello!")
    """
    
    def __init__(
        self,
        model,
        model_name: str = "gemini-pro",
        default_system_instruction: Optional[str] = None
    ):
        super().__init__(
            model_name=model_name,
            model_provider="google",
            default_system_instruction=default_system_instruction
        )
        self.model = model
    
    def _call_model(self, prompt: str, **kwargs) -> Any:
        full_prompt = prompt
        if self.default_system_instruction:
            full_prompt = f"{self.default_system_instruction}\n\n{prompt}"
        
        return self.model.generate_content(full_prompt, **kwargs)
    
    def _extract_content(self, response: Any) -> str:
        return response.text if hasattr(response, 'text') else ""
    
    def _extract_token_usage(self, response: Any, prompt: str, content: str) -> TokenUsage:
        # Gemini may provide token counts in usage_metadata
        if hasattr(response, 'usage_metadata'):
            meta = response.usage_metadata
            return TokenUsage(
                prompt_tokens=getattr(meta, 'prompt_token_count', 0),
                completion_tokens=getattr(meta, 'candidates_token_count', 0),
                total_tokens=getattr(meta, 'total_token_count', 0)
            )
        return super()._extract_token_usage(response, prompt, content)


class FunctionWrapper:
    """
    Generic wrapper to trace any function as a tool/function call.
    
    Example:
        def search_database(query: str) -> list:
            # ... search logic
            return results
        
        traced_search = FunctionWrapper(
            search_database,
            span_name="database_search",
            span_type=SpanType.TOOL
        )
        
        results = traced_search("find users")
    """
    
    def __init__(
        self,
        func: Callable,
        span_name: Optional[str] = None,
        span_type: SpanType = SpanType.TOOL,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.func = func
        self.span_name = span_name or func.__name__
        self.span_type = span_type
        self.metadata = metadata or {}
    
    def __call__(self, *args, **kwargs):
        with trace_span(
            name=self.span_name,
            span_type=self.span_type,
            metadata={**self.metadata, "args_count": len(args), "kwargs_keys": list(kwargs.keys())}
        ) as span:
            span.input_data = {
                "args": [str(a)[:200] for a in args],
                "kwargs": {k: str(v)[:200] for k, v in kwargs.items()}
            }
            
            try:
                result = self.func(*args, **kwargs)
                span.output_data = str(result)[:500]
                return result
            except Exception as e:
                span.error = str(e)
                span.error_type = type(e).__name__
                raise
