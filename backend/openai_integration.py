"""
openai_integration.py
---------------------
Handles OpenAI file storage and Assistant vector store integration for RAG workflows.
"""

import os
import logging
import openai  # Make sure to install openai package

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Set your API key in environment or config


def upload_file_to_openai_storage(file_path: str, purpose: str = "assistants") -> str:
    """
    Uploads a file to OpenAI's file storage for use with Assistants.
    Returns the OpenAI file ID on success, or raises an exception on failure.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    openai.api_key = OPENAI_API_KEY
    try:
        with open(file_path, "rb") as f:
            response = openai.files.create(file=f, purpose=purpose)
        file_id = response.id
        logging.info(f"Uploaded {file_path} to OpenAI storage with file_id: {file_id}")
        return file_id
    except Exception as e:
        logging.error(f"Failed to upload {file_path} to OpenAI storage: {e}")
        raise


def add_file_to_openai_assistant_vector_store(file_id: str, assistant_id: str = None, model: str = "gpt-4o") -> str:
    """
    Attaches a file to the central OpenAI vector store for retrieval by the assistant.
    Returns the Assistant ID.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    openai.api_key = OPENAI_API_KEY
    VECTOR_STORE_ID = os.getenv("OPENAI_VECTOR_STORE_ID")
    if not VECTOR_STORE_ID:
        raise ValueError("OPENAI_VECTOR_STORE_ID environment variable not set.")
    try:
        # Attach file to the central vector store (not just a thread)
        openai.beta.vector_stores.files.create(
            vector_store_id=VECTOR_STORE_ID,
            file_id=file_id
        )
        logging.info(f"Attached file {file_id} to vector store {VECTOR_STORE_ID}.")
        # Optionally, update the assistant to use this vector store if not already
        if assistant_id is not None:
            openai.beta.assistants.update(
                assistant_id=assistant_id,
                tool_resources={"file_search": {"vector_store_ids": [VECTOR_STORE_ID]}}
            )
            logging.info(f"Ensured assistant {assistant_id} uses vector store {VECTOR_STORE_ID}.")
        return assistant_id
    except Exception as e:
        logging.error(f"Failed to add file {file_id} to vector store: {e}")
        raise


def query_openai_assistant(question: str, assistant_id: str, file_id: str = None) -> str:
    """
    Sends a question to the OpenAI Assistant (with retrieval enabled) and returns the answer.
    Optionally attaches a file (already uploaded and embedded) for context.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    openai.api_key = OPENAI_API_KEY
    try:
        thread = openai.beta.threads.create()
        message_kwargs = {
            "thread_id": thread.id,
            "role": "user",
            "content": question
        }
        if file_id:
            message_kwargs["attachments"] = [{"file_id": file_id, "tools": [{"type": "file_search"}]}]
        openai.beta.threads.messages.create(**message_kwargs)
        run = openai.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
        # Wait for the run to complete (polling)
        import time
        while True:
            run_status = openai.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
            if run_status.status in ["completed", "failed", "cancelled"]:
                break
            time.sleep(1)
        if run_status.status != "completed":
            raise RuntimeError(f"Assistant run failed with status: {run_status.status}")
        messages = openai.beta.threads.messages.list(thread_id=thread.id)
        # Get the latest assistant message
        for msg in reversed(messages.data):
            if msg.role == "assistant":
                return msg.content[0].text.value
        return "No answer returned by assistant."
    except Exception as e:
        logging.error(f"Failed to query OpenAI Assistant: {e}")
        raise


def query_openai_assistant_batch(questions: list, assistant_id: str) -> list:
    """
    Sends a batch of questions to the OpenAI Assistant and returns a list of answers.
    Each question is answered in order. The prompt instructs the assistant to answer each question separately.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    openai.api_key = OPENAI_API_KEY
    try:
        thread = openai.beta.threads.create()
        # Compose a prompt that numbers each question for clarity
        prompt = "You will be given a list of questions. Please answer each question separately, numbering your answers to match the questions.\n\n"
        for idx, q in enumerate(questions, 1):
            prompt += f"{idx}. {q}\n"
        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=prompt
        )
        run = openai.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
        import time
        while True:
            run_status = openai.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)
            if run_status.status in ["completed", "failed", "cancelled"]:
                break
            time.sleep(1)
        if run_status.status != "completed":
            raise RuntimeError(f"Assistant run failed with status: {run_status.status}")
        messages = openai.beta.threads.messages.list(thread_id=thread.id)
        for msg in reversed(messages.data):
            if msg.role == "assistant":
                # Split answers by numbered lines
                lines = [line.strip() for line in msg.content[0].text.value.splitlines() if line.strip()]
                # Extract answers after the number and dot (e.g., '1. answer')
                answers = []
                for line in lines:
                    if any(line.startswith(f"{i}.") for i in range(1, len(questions)+1)):
                        ans = line.split(".", 1)[-1].strip()
                        answers.append(ans)
                # Fallback: if not enough answers, just return lines
                if len(answers) < len(questions):
                    answers = lines
                return answers[:len(questions)]
        return ["No answer returned by assistant."] * len(questions)
    except Exception as e:
        logging.error(f"Failed to batch query OpenAI Assistant: {e}")
        raise
