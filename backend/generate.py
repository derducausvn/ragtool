"""
generate.py (OpenAI Assistant Version)
--------------------------------------
Minimal answer generation using OpenAI Assistant API.
"""

from openai_integration import query_openai_assistant, query_openai_assistant_batch
import os

ASSISTANT_ID = os.getenv("OPENAI_RAG_ASSISTANT_ID")  # Set this in your .env or config


def generate_answer_with_assistant(questions):
    """
    Generate answers for a list of questions using the OpenAI Assistant in a single batch call.
    Returns a list of answer strings.
    """
    if not ASSISTANT_ID:
        return ["Assistant ID not configured."] * len(questions)
    try:
        # If a single string is passed, wrap in a list for backward compatibility
        if isinstance(questions, str):
            questions = [questions]
        from openai_integration import query_openai_assistant_batch
        answers = query_openai_assistant_batch(questions, ASSISTANT_ID)
        return answers
    except Exception as e:
        return [f"Assistant error: {e}"] * len(questions)
