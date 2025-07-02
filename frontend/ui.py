import streamlit as st
import requests

st.set_page_config(page_title="Questionnaire Assistant", page_icon="💬", layout="wide")
st.title("💬 Questionnaire Assistant Demo")

API_BASE = "http://localhost:8000"

tab1, tab2 = st.tabs(["🔍 Chat & Ask", "📄 Upload Questionnaire"])

# --- Tab 1: Chat-like interface ---
with tab1:
    st.subheader("What can I help you with?")

    mode = st.radio("Answering mode:", ["General Chat", "F24 QA Expert"], horizontal=True)

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    # Display chat messages
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Chat input
    if user_input := st.chat_input("Type your question..."):
        st.chat_message("user").markdown(user_input)
        st.session_state.chat_history.append({"role": "user", "content": user_input})

        with st.spinner("Searching knowledge..." if mode == "F24 QA Expert" else "Thinking..."):
            try:
                res = requests.post(f"{API_BASE}/generate", json={"question": user_input, "mode": mode})
                res.raise_for_status()
                data = res.json()

                # Build assistant response by mode
                if mode == "F24 QA Expert":
                    response = f"**Answer:** {data['answer']}"
                    if data.get("confidence_score") is not None:
                        response += f"\n\n**Confidence:** {round(data['confidence_score'] * 100)}%"
                    if data.get("sources"):
                        response += "\n**Sources:** " + ", ".join(data["sources"])
                else:
                    response = f"**Answer:** {data['answer']}"

                st.chat_message("assistant").markdown(response)
                st.session_state.chat_history.append({"role": "assistant", "content": response})

            except Exception as e:
                error_msg = f"❌ Failed to fetch answer: {e}"
                st.chat_message("assistant").markdown(error_msg)
                st.session_state.chat_history.append({"role": "assistant", "content": error_msg})

# --- Tab 2: Upload Questionnaire ---
with tab2:
    st.subheader("Upload Questionnaire")
    uploaded_file = st.file_uploader("Upload unsolved questionnaires here to get auto-generated answers", type=["xlsx", "pdf", "docx"])

    if uploaded_file:
        if st.button("Generate Answers"):
            with st.spinner("Searching Knowledge"):
                try:
                    files = {"file": (uploaded_file.name, uploaded_file.getvalue())}
                    res = requests.post(f"{API_BASE}/answer-questionnaire", files=files)
                    res.raise_for_status()
                    data = res.json()

                    st.success("✅ Answers generated:")

                    for i, qa in enumerate(data.get("questions_and_answers", []), start=1):
                        # Question bubble
                        with st.chat_message("user"):
                            st.markdown(qa["question"])

                        # Answer bubble
                        with st.chat_message("assistant"):
                            st.markdown(f"**Answer:** {qa['answer']}")
                            
                            if "confidence_score" in qa:
                                conf_percent = round(qa["confidence_score"] * 100)
                                st.markdown(f"**Confidence:** `{conf_percent}%`")

                            if qa.get("sources"):
                                sources = ", ".join(qa["sources"])
                                st.markdown(f"**Sources:** {sources}")

                except Exception as e:
                    st.error(f"❌ Failed to process file: {e}")

# --- Sidebar: Admin Tools ---
with st.sidebar:
    st.header("⚙️ Admin Tools")

    if st.button("🔄 Sync Knowledge Base"):
        with st.spinner("Syncing from solved questionnaires and F24 HelpDocs..."):
            try:
                res = requests.post("http://localhost:8000/sync-knowledge")
                res.raise_for_status()
                result = res.json()

                st.success("✅ Knowledge base synced.")

                st.markdown(f"""
                **📁 Files Processed:** `{result.get("files_processed", 0)}`
                
                **📄 Documents Embedded:** `{result.get("documents_embedded", 0)}`
                
                **🌐 HelpDocs Pages Embedded:** `{result.get("web_pages_embedded", 0)}`
                """)

                if skipped := result.get("files_skipped", []):
                    st.warning(f"⚠️ Skipped {len(skipped)} file(s):")
                    for file in skipped:
                        st.markdown(f"- {file}")

            except Exception as e:
                st.error(f"❌ Sync failed: {e}")
