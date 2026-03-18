"""
Model Client Service

Handles generating responses from different LLM providers.
"""
import logging
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI

from ..config import settings

logger = logging.getLogger(__name__)


class ModelClient:
    """Client for generating responses from various LLM providers"""
    
    def __init__(
        self,
        model_name: str,
        provider: str = "google",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None
    ):
        self.model_name = model_name
        self.provider = provider
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.system_prompt = system_prompt
        self._client = None
    
    def _get_google_client(self):
        """Get or create Google LLM client"""
        if self._client is None:
            api_key = settings.gemini_api_key or settings.google_api_key
            if not api_key:
                raise ValueError("Google API key not configured")
            
            self._client = ChatGoogleGenerativeAI(
                model=self.model_name,
                google_api_key=api_key,
                temperature=self.temperature,
                max_output_tokens=self.max_tokens,
                streaming=False
            )
        return self._client
    
    async def generate(self, prompt: str) -> str:
        """Generate a response from the model"""
        try:
            if self.provider == "google":
                client = self._get_google_client()
                
                # Build messages
                from langchain_core.messages import HumanMessage
                messages = [HumanMessage(content=prompt)]
                
                # Invoke model
                response = await client.ainvoke(messages)
                return response.content
            
            elif self.provider == "openai":
                # OpenAI implementation
                from langchain_openai import ChatOpenAI
                client = ChatOpenAI(
                    model=self.model_name,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    api_key=settings.openai_api_key
                )
                messages = [{"role": "user", "content": prompt}]
                response = await client.ainvoke(messages)
                return response.content
            
            elif self.provider == "anthropic":
                # Anthropic implementation
                from langchain_anthropic import ChatAnthropic
                client = ChatAnthropic(
                    model=self.model_name,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    anthropic_api_key=settings.anthropic_api_key
                )
                messages = [{"role": "user", "content": prompt}]
                response = await client.ainvoke(messages)
                return response.content
            
            else:
                raise ValueError(f"Unsupported provider: {self.provider}")
        
        except Exception as e:
            logger.error(f"Error generating response from {self.provider}/{self.model_name}: {e}")
            raise
    
    async def generate_with_context(
        self,
        prompt: str,
        context: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate response with context"""
        full_prompt = f"Context: {context}\n\nQuestion: {prompt}"
        return await self.generate(full_prompt)
    
    async def generate_chat(
        self,
        messages: list
    ) -> str:
        """Generate response from chat history"""
        try:
            if self.provider == "google":
                from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
                
                langchain_messages = []
                for msg in messages:
                    if msg.get("role") == "system":
                        langchain_messages.append(SystemMessage(content=msg["content"]))
                    elif msg.get("role") == "user":
                        langchain_messages.append(HumanMessage(content=msg["content"]))
                    elif msg.get("role") == "assistant":
                        langchain_messages.append(AIMessage(content=msg["content"]))
                
                client = self._get_google_client()
                response = await client.ainvoke(langchain_messages)
                return response.content
            
            else:
                # For other providers, convert to single prompt
                prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
                return await self.generate(prompt)
        
        except Exception as e:
            logger.error(f"Error in chat generation: {e}")
            raise


def get_available_providers() -> list:
    """Get list of available providers based on API keys"""
    providers = []
    
    if settings.gemini_api_key or settings.google_api_key:
        providers.append("google")
    if settings.openai_api_key:
        providers.append("openai")
    if settings.anthropic_api_key:
        providers.append("anthropic")
    
    return providers


def get_default_provider() -> str:
    """Get the default provider based on available API keys"""
    providers = get_available_providers()
    if not providers:
        raise ValueError("No LLM API keys configured")
    return providers[0]
