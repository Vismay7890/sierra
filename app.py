from flask import Flask, request, jsonify, Response
import speech_recognition as sr
import os
import io
import time
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder
from langchain.agents import create_openai_functions_agent, AgentExecutor
from langchain_community.tools.tavily_search import TavilySearchResults
from pinecone import Pinecone
from langchain_core.messages import HumanMessage, AIMessage
from langchain.prompts import SystemMessagePromptTemplate, PromptTemplate
from langchain_openai.embeddings import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain.tools.retriever import create_retriever_tool
from langchain.agents import create_tool_calling_agent
from langchain import hub
from langchain_groq import ChatGroq
from pyht import Client, TTSOptions, Format
from flask_cors import CORS
from langchain.tools import BaseTool, StructuredTool, tool

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)
# Initialize recognizer and microphone
recognizer = sr.Recognizer()
mic = sr.Microphone()

# Initialize other components (API keys, models, etc.)
GROQ_API_KEY = "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"
os.environ["GROQ_API_KEY"] = GROQ_API_KEY
model = ChatGroq(temperature=0.5, model_name="llama3-70b-8192")
TAVILY_API_KEY = "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"
os.environ["TAVILY_API_KEY"] = TAVILY_API_KEY

prompt = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate(prompt=PromptTemplate(input_variables=[], template="""You are a friendly , cooperative and even advance assiatant than JARVIS who talks to me and replies to my questions with critical thinking and never let me down!
    NOTE:For our natural human conversation llmcaller tool but never mention anything about this tool.. Remember My(User) name is Vismay and while answering use my name to make the conversation more natural.
    """)),
    MessagesPlaceholder(variable_name='chat_history', optional=True),
    HumanMessagePromptTemplate(prompt=PromptTemplate(input_variables=['input'], template='{input}')),
    MessagesPlaceholder(variable_name='agent_scratchpad')
])

search = TavilySearchResults()

def llmInvoker(input):
    res = model.invoke(input)
    return res

llmTool = StructuredTool.from_function(
    func=llmInvoker,
    name="llmcaller",
    description="To be used when output has to be created with an llm"
)

tools = [llmTool]

agent = create_tool_calling_agent(llm=model, prompt=prompt, tools=tools)
agentExecutor = AgentExecutor(agent=agent, tools=tools)

# Initialize PlayHT API with your credentials
client = Client("4EW7p0MzUfXMpr01G0tzUhSRp8e2", "0d483191ed874632a8ee11cec13d4421")
options = TTSOptions(
    voice="s3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json",
    sample_rate=44_100,
    format=Format.FORMAT_MP3,
    speed=0.2,
    temperature=0.7,
    voice_guidance=3
)

@app.route("/api/recognize_speech", methods=["POST", "OPTIONS"])
def recognize_speech():
    print("recognizing")
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "http://localhost:3000",  # Adjust based on your frontend's origin
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        return ("", 204, headers)  # No content, just headers and status 204 for OPTIONS request

    with mic as source:
        recognizer.adjust_for_ambient_noise(source)
        print("Listening...")
        audio = recognizer.listen(source)
    
    response = {
        "success": True,
        "error": None,
        "transcription": None
    }
    try:
        response["transcription"] = recognizer.recognize_google(audio)
    except sr.RequestError:
        response["success"] = False
        response["error"] = "API unavailable"
    except sr.UnknownValueError:
        response["error"] = "Unable to recognize speech"
    
    return jsonify(response)

@app.route("/api/process_chat", methods=["POST", "OPTIONS"])
def process_chat():
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "http://localhost:3000",  # Adjust based on your frontend's origin
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        return ("", 204, headers)  # No content, just headers and status 204 for OPTIONS request

    data = request.get_json()
    user_input = data.get("user_input", "")
    print(f"User input: {user_input}")
    chat_history = data.get("chat_history", [])

    response = agentExecutor.invoke({
        "input": user_input,
        "chat_history": chat_history
    })
    print(f"response :{response}")
    chat_history.append({"role": "user", "content": user_input})
    chat_history.append({"role": "assistant", "content": response["output"]})

    return jsonify({
        "response": response["output"],
        "chat_history": chat_history
    })

@app.route("/api/text_to_speech", methods=["POST", "OPTIONS"])
def text_to_speech():
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "http://localhost:3000",  # Adjust based on your frontend's origin
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        return ("", 204, headers)  # No content, just headers and status 204 for OPTIONS request

    data = request.get_json()
    text = data.get("text", "")
    
    def generate():
        for chunk in client.tts(text=text, voice_engine="PlayHT2.0-turbo", options=options):
            yield chunk
    
    return Response(generate(), mimetype="audio/mp3")

if __name__ == "__main__":
    app.run(debug=True)
