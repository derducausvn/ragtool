"""
openai_integration.py
---------------------
Handles OpenAI Assistant interactions for RAG workflows.
Note: File upload functions have been moved to openai_file_upload.py
"""

import os
import logging
import re
import openai  # Make sure to install openai package

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Set your API key in environment or config


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
        
        # Clean up formatting issues but preserve paragraph structure
        # First normalize line endings to \n
        answer = raw_answer.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove excessive line breaks (more than 2) but keep paragraph breaks
        answer = re.sub(r'\n{3,}', '\n\n', answer)  # Replace 3+ line breaks with 2
        
        # Clean up spaces but don't remove all double spaces (some may be intentional)
        answer = re.sub(r'[ \t]+', ' ', answer)  # Replace multiple spaces/tabs with single space
        answer = re.sub(r' +\n', '\n', answer)   # Remove spaces before line breaks
        answer = re.sub(r'\n +', '\n', answer)   # Remove spaces after line breaks
        
        # Remove all citation patterns - we just want the pure answer
        # Handle various citation formats: [1], [1:2], [1:2*source], 【4:0†source】, etc.
        answer = re.sub(r'\[[0-9]+(?::[0-9]+)?(?:\*[^\]]*)?[^\]]*\]', '', answer)  # [1], [1:2], [1:2*source]
        answer = re.sub(r'【[0-9]+(?::[0-9]+)?(?:†[^】]*)?[^】]*】', '', answer)  # 【4:0†source】
        answer = re.sub(r'\([0-9]+(?::[0-9]+)?(?:\*[^\)]*)?[^\)]*\)', '', answer)  # (1), (1:2), (1:2*source)
        
        # Final cleanup - preserve line breaks but clean up excessive spacing
        answer = re.sub(r'[ \t]+', ' ', answer)    # Multiple spaces to single space
        answer = re.sub(r'\n\s*\n\s*\n+', '\n\n', answer)  # Multiple line breaks to double
        answer = answer.strip()  # Remove leading/trailing whitespace only
        
        logging.info(f"Answer length: {len(answer)}")
        logging.info(f"Answer preview: {answer[:200]}...")
        
        return answer
        
    except Exception as e:
        logging.error(f"Failed to query OpenAI Assistant: {e}")
        raise


def query_openai_assistant_batch(questions: list, assistant_id: str) -> list:
    """
    Processes multiple questions by calling the individual query function for each.
    This ensures identical behavior between individual and batch processing.
    """
    logging.info(f"=== Processing {len(questions)} Questions Individually ===")
    
    answers = []
    for i, question in enumerate(questions, 1):
        logging.info(f"Processing question {i}/{len(questions)}: {question[:100]}...")
        
        try:
            # Use the exact same function as individual F24 expert mode
            answer = query_openai_assistant(question, assistant_id)
            answers.append(answer)
            logging.info(f"✅ Question {i} answered successfully")
            
        except Exception as question_error:
            logging.error(f"❌ Failed to process question {i}: {question_error}")
            answers.append(f"Error processing this question: {str(question_error)}")
    
    logging.info(f"=== Processing Complete: {len(answers)} answers generated ===")
    return answers
