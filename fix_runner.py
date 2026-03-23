with open('app/services/evaluation_runner.py', 'r') as f:
    content = f.read()

# Replace specific block in run
orig1 = """                    except Exception as e:
                        logger.error(f"Error evaluating test case {test_case.get('id')}: {e}")"""
new1 = """                    except Exception as e:
                        logger.error(f"Error evaluating test case {test_case.get('id')}: {e}")
                        # Add a failed result for tracking if _evaluate_test_case fails completely
                        failed_result = TestCaseResult(
                            id=str(uuid.uuid4()),
                            test_case_id=test_case.get("id", ""),
                            test_case_name=test_case.get("name", ""),
                            model_name=model_name,
                            input_prompt=test_case.get("input", {}).get("prompt", ""),
                            model_response="",
                            error=str(e),
                            passed=False,
                            created_at=datetime.now(timezone.utc)
                        )
                        await self._store_result(failed_result)"""

orig2 = """                    except Exception as e:
                        logger.error(f"Error evaluating test case: {e}")"""
new2 = """                    except Exception as e:
                        logger.error(f"Error evaluating test case: {e}")
                        failed_result = TestCaseResult(
                            id=str(uuid.uuid4()),
                            test_case_id=test_case.get("id", ""),
                            test_case_name=test_case.get("name", ""),
                            model_name=model_name,
                            input_prompt=test_case.get("input", {}).get("prompt", ""),
                            model_response="",
                            error=str(e),
                            passed=False,
                            created_at=datetime.now(timezone.utc)
                        )
                        results[model_name].append(failed_result.model_dump())
                        await self._store_result(failed_result)"""

content = content.replace(orig1, new1)
content = content.replace(orig2, new2)

with open('app/services/evaluation_runner.py', 'w') as f:
    f.write(content)
