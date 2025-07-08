#!/usr/bin/env python3
"""
test_improvements.py
-------------------
Quick test to validate the improved PGVector system after migration.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our modules
from embedding import search_documents
from generate import generate_answer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_vector_search():
    """Test the vector search functionality."""
    print("\n🔍 Testing vector search...")
    
    query = "What is F24?"
    results = search_documents(query, k=3)
    
    if results:
        print(f"✅ Found {len(results)} results for query: '{query}'")
        for i, doc in enumerate(results):
            preview = doc.page_content[:100].replace('\n', ' ') + "..."
            print(f"   {i+1}. {preview}")
    else:
        print(f"❌ No results found for query: '{query}'")
    
    return len(results) > 0

def test_qa_generation():
    """Test the Q&A generation functionality."""
    print("\n💬 Testing Q&A generation...")
    
    question = "What is F24?"
    response = generate_answer(question, mode="F24 QA Expert")
    
    if response.get("answer"):
        print(f"✅ Generated answer for: '{question}'")
        print(f"   Answer preview: {response['answer'][:150]}...")
        if response.get("sources"):
            print(f"   Sources: {response['sources']}")
    else:
        print(f"❌ Failed to generate answer for: '{question}'")
    
    return bool(response.get("answer"))

def test_general_chat():
    """Test the general chat functionality."""
    print("\n🤖 Testing general chat...")
    
    question = "What's the weather like today?"
    response = generate_answer(question, mode="General Chat")
    
    if response.get("answer"):
        print(f"✅ Generated chat response for: '{question}'")
        print(f"   Response preview: {response['answer'][:150]}...")
    else:
        print(f"❌ Failed to generate chat response for: '{question}'")
    
    return bool(response.get("answer"))

def main():
    """Run all tests."""
    load_dotenv()
    
    print("🧪 Testing improved RAG system...")
    print("=" * 50)
    
    # Check environment
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not set")
        return False
    
    if not os.getenv("DATABASE_URL"):
        print("❌ DATABASE_URL not set")
        return False
    
    print("✅ Environment variables configured")
    
    # Run tests
    tests = [
        ("Vector Search", test_vector_search),
        ("Q&A Generation", test_qa_generation),
        ("General Chat", test_general_chat),
    ]
    
    passed = 0
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} passed")
            else:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"❌ {test_name} error: {e}")
    
    print("\n" + "=" * 50)
    print(f"🎯 Test Results: {passed}/{len(tests)} passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! System is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Check the logs above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
