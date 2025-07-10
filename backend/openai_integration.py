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


def add_file_to_openai_assistant_vector_store(file_id: str, assistant_id: str = None) -> str:
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
    Sends a question to the OpenAI Assistant and returns the answer.
    Simple, direct call to the assistant with enhanced logging for debugging.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    
    openai.api_key = OPENAI_API_KEY
    
    try:
        logging.info(f"=== OpenAI Assistant Call Debug ===")
        logging.info(f"Question: {question[:100]}...")
        logging.info(f"Assistant ID: {assistant_id}")
        logging.info(f"File ID: {file_id}")
        
        # Create thread - each call gets a fresh thread (no conversation context)
        thread = openai.beta.threads.create(
            messages=[{
                "role": "user",
                "content": question,
                **({"attachments": [{"file_id": file_id, "tools": [{"type": "file_search"}]}]} if file_id else {})
            }]
        )
        logging.info(f"Created thread: {thread.id}")
        
        # Run assistant and wait for completion
        run = openai.beta.threads.runs.create_and_poll(
            thread_id=thread.id,
            assistant_id=assistant_id
        )
        logging.info(f"Run completed with status: {run.status}")
        logging.info(f"Run ID: {run.id}")
        
        if run.status != 'completed':
            logging.error(f"Run details: {run}")
            raise RuntimeError(f"Assistant run failed with status: {run.status}")
        
        # Get the response
        messages = openai.beta.threads.messages.list(thread_id=thread.id)
        assistant_message = messages.data[0]
        
        # Extract text content and handle citations properly
        text_content = assistant_message.content[0].text
        raw_answer = text_content.value
        
        # Clean up formatting issues that cause chunked display
        # Remove excessive line breaks and normalize spacing
        answer = raw_answer.replace('\n\n\n', '\n\n')  # Remove triple line breaks
        answer = answer.replace('  ', ' ')  # Remove double spaces
        answer = answer.strip()  # Remove leading/trailing whitespace
        
        logging.info(f"Answer length: {len(answer)}")
        logging.info(f"Answer preview: {answer[:200]}...")
        
        # Process citations/annotations for better answer quality
        citations = []
        if hasattr(text_content, 'annotations') and text_content.annotations:
            logging.info(f"Citations found: {len(text_content.annotations)}")
            for i, annotation in enumerate(text_content.annotations):
                logging.info(f"  Citation {i+1}: {annotation}")
                
                # Extract citation information
                citation_info = {}
                if hasattr(annotation, 'file_citation') and annotation.file_citation:
                    citation_info['file_id'] = annotation.file_citation.file_id
                    citation_info['quote'] = getattr(annotation.file_citation, 'quote', '')
                elif hasattr(annotation, 'file_path') and annotation.file_path:
                    citation_info['file_id'] = annotation.file_path.file_id
                
                citation_info['text'] = annotation.text
                citations.append(citation_info)
                
            # If citations exist, potentially enhance the answer
            if citations:
                logging.info(f"Processed {len(citations)} citations")
        else:
            logging.warning("No citations found - this may indicate a configuration issue")
        
        return answer
        
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
        # Send questions in numbered format for clear structure
        content = ""
        for idx, q in enumerate(questions, 1):
            content += f"{idx}. {q}\n"
        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=content.strip()
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
                full_response = msg.content[0].text.value
                logging.info(f"Assistant full response: {full_response[:200]}...")  # Log first 200 chars
                
                # Split answers by numbered lines
                lines = [line.strip() for line in full_response.splitlines() if line.strip()]
                
                # Try to extract numbered answers first
                answers = []
                for line in lines:
                    if any(line.startswith(f"{i}.") for i in range(1, len(questions)+1)):
                        ans = line.split(".", 1)[-1].strip()
                        answers.append(ans)
                
                # If we have enough numbered answers, use them
                if len(answers) >= len(questions):
                    logging.info(f"Using numbered answers: {len(answers)} answers found")
                    return answers[:len(questions)]
                
                # Fallback: if no numbered format or not enough answers
                # For single questions, return the full response
                if len(questions) == 1:
                    logging.info("Single question: returning full response")
                    return [full_response.strip()]
                
                # For multiple questions, try to split by paragraphs or return full response per question
                if len(lines) >= len(questions):
                    logging.info(f"Using line-based splitting: {len(lines)} lines for {len(questions)} questions")
                    return lines[:len(questions)]
                else:
                    # Return the full response for each question as fallback
                    logging.info("Fallback: returning full response for each question")
                    return [full_response.strip()] * len(questions)
        return ["No answer returned by assistant."] * len(questions)
    except Exception as e:
        logging.error(f"Failed to batch query OpenAI Assistant: {e}")
        raise
