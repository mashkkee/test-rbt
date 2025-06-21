from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import logging
from datetime import datetime
import uuid
import json
from werkzeug.utils import secure_filename
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.text_splitter import CharacterTextSplitter
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain_community.document_loaders import PyPDFLoader
import requests
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['DATA_FOLDER'] = 'data'

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['DATA_FOLDER'], exist_ok=True)
os.makedirs('logs', exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/turbot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


DATABASE_URL = "postgresql://postgres.hbutkdlvjsbnspxvregv:lopta123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Database connection
def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return None

# Initialize database tables
def init_database():
    """Initialize database tables"""
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        with conn.cursor() as cursor:
            # Create table for travel packages
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS travel_packages (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    title VARCHAR(500),
                    description TEXT,
                    destinations JSONB,
                    duration_days INTEGER,
                    duration_nights INTEGER,
                    transport_type VARCHAR(100),
                    dates JSONB,
                    prices JSONB,
                    hotels JSONB,
                    includes JSONB,
                    excludes JSONB,
                    highlights JSONB,
                    contact_info JSONB,
                    raw_content TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create index for faster searches
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_travel_packages_filename 
                ON travel_packages(filename)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_travel_packages_destinations 
                ON travel_packages USING GIN(destinations)
            """)
            
            conn.commit()
            logger.info("Database tables initialized successfully")
            return True
            
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        return False
    finally:
        if conn:
            conn.close()


# Initialize database on startup
init_database()

def extract_structured_data(content: str, filename: str) -> Dict:
    """Extract structured data from travel document using LLM"""
    if not llm:
        return {}
    
    try:
        extraction_prompt = ChatPromptTemplate.from_template("""
        Analiziraj sledeći turistički dokument i izdvoji strukturirane podatke u JSON formatu.
        
        VAŽNO: Izvlači SAMO podatke koji STVARNO postoje u dokumentu. Ne izmišljaj podatke!
        
        Dokument: {content}
        
        Vrati JSON sa sledećim poljima (ostavi prazno ili null ako podaci ne postoje):
        {{
            "title": "Naslov putovanja",
            "description": "Kratak opis putovanja", 
            "destinations": ["lista glavnih destinacija"],
            "duration_days": broj_dana,
            "duration_nights": broj_noćenja,
            "transport_type": "tip prevoza",
            "dates": [
                {{
                    "departure_date": "datum polaska",
                    "return_date": "datum povratka", 
                    "price_regular": cena_regularna,
                    "price_discounted": cena_sa_popustom
                }}
            ],
            "hotels": [
                {{
                    "name": "naziv hotela",
                    "category": "kategorija",
                    "location": "lokacija"
                }}
            ],
            "includes": ["šta je uključeno u cenu"],
            "excludes": ["šta NIJE uključeno u cenu"],
            "highlights": ["glavne atrakcije/aktivnosti"],
            "additional_costs": {{
                "single_room_supplement": iznos,
                "optional_tours": iznos,
                "other": "ostali troškovi"
            }}
        }}
        
        Odgovori SAMO sa JSON-om, bez dodatnog teksta.
        """)
        
        chain = extraction_prompt | llm
        response = chain.invoke({"content": content[:4000]})  # Limit content size
        
        # Parse JSON response
        json_str = response.content.strip()
        
        # Clean up response if it contains markdown formatting
        if json_str.startswith("```json"):
            json_str = json_str.replace("```json", "").replace("```", "").strip()
        
        try:
            structured_data = json.loads(json_str)
            return structured_data
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error for {filename}: {e}")
            logger.error(f"Response was: {json_str}")
            return {}
            
    except Exception as e:
        logger.error(f"Structured data extraction error for {filename}: {e}")
        return {}

def save_to_database(filename: str, structured_data: Dict, raw_content: str) -> bool:
    """Save structured data to database"""
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        with conn.cursor() as cursor:
            # Check if record already exists
            cursor.execute("SELECT id FROM travel_packages WHERE filename = %s", (filename,))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing record
                cursor.execute("""
                    UPDATE travel_packages SET
                        title = %s,
                        description = %s,
                        destinations = %s,
                        duration_days = %s,
                        duration_nights = %s,
                        transport_type = %s,
                        dates = %s,
                        prices = %s,
                        hotels = %s,
                        includes = %s,
                        excludes = %s,
                        highlights = %s,
                        raw_content = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE filename = %s
                """, (
                    structured_data.get('title'),
                    structured_data.get('description'),
                    json.dumps(structured_data.get('destinations', [])),
                    structured_data.get('duration_days'),
                    structured_data.get('duration_nights'),
                    structured_data.get('transport_type'),
                    json.dumps(structured_data.get('dates', [])),
                    json.dumps(structured_data.get('additional_costs', {})),
                    json.dumps(structured_data.get('hotels', [])),
                    json.dumps(structured_data.get('includes', [])),
                    json.dumps(structured_data.get('excludes', [])),
                    json.dumps(structured_data.get('highlights', [])),
                    raw_content,
                    filename
                ))
            else:
                # Insert new record
                cursor.execute("""
                    INSERT INTO travel_packages (
                        filename, title, description, destinations, duration_days,
                        duration_nights, transport_type, dates, prices, hotels,
                        includes, excludes, highlights, raw_content
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    filename,
                    structured_data.get('title'),
                    structured_data.get('description'),
                    json.dumps(structured_data.get('destinations', [])),
                    structured_data.get('duration_days'),
                    structured_data.get('duration_nights'),
                    structured_data.get('transport_type'),
                    json.dumps(structured_data.get('dates', [])),
                    json.dumps(structured_data.get('additional_costs', {})),
                    json.dumps(structured_data.get('hotels', [])),
                    json.dumps(structured_data.get('includes', [])),
                    json.dumps(structured_data.get('excludes', [])),
                    json.dumps(structured_data.get('highlights', [])),
                    raw_content
                ))
            
            conn.commit()
            return True
            
    except Exception as e:
        logger.error(f"Database save error for {filename}: {e}")
        return False
    finally:
        if conn:
            conn.close()



# Domain keywords for travel/tourism validation (Serbian and English)
TRAVEL_KEYWORDS = {
    # Serbian keywords
    "turizam", "putovanje", "hotel", "destinacija", "odmor", "letnovanje", 
    "zimovanje", "avion", "let", "smeštaj", "restoran", "atrakcija", 
    "tura", "izlet", "vodič", "rezervacija", "itinerer", "grad", 
    "zemlja", "plaža", "planina", "muzej", "kultura", "avantura", 
    "krstarenje", "viza", "pasoš", "prtljag", "prevoz", "aerodrom",
    "srbija", "beograd", "novi sad", "niš", "kragujevac", "subotica", 
    "pančevo", "zemun", "vojvodina", "šumadija", "zlatibor", "kopaonik",
    "fruška gora", "đerdap", "ram", "sremski karlovci", "oplenac",
    "studenica", "manasija", "ravanica", "sopoćani", "hilandar",
    "cena", "dinar", "evro", "doručak", "noćenje", "takse", "fakultativni",
    "polazak", "povratak", "transfer", "autobus", "grupa", "putnik",
    # English keywords
    "tourism", "travel", "hotel", "destination", "vacation", "holiday", 
    "flight", "accommodation", "restaurant", "attraction", "tour", 
    "guide", "booking", "itinerary", "city", "country", "beach", 
    "mountain", "museum", "culture", "adventure", "cruise", "resort",
    "visa", "passport", "luggage", "transportation", "airport"
}

# Initialize LLM with Azure OpenAI configuration
try:
    llm = ChatOpenAI(
        model_name="gpt-4o-mini",  # Cost-effective model
        temperature=0.3,
        max_tokens=800,  # Increased for Serbian responses
        base_url="https://models.inference.ai.azure.com",
        api_key=os.environ.get("OPENAI_API_KEY")
    )
    logger.info("LLM initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize LLM: {e}")
    llm = None

# Initialize embeddings for Azure OpenAI
try:
    embeddings = OpenAIEmbeddings(
        base_url="https://models.inference.ai.azure.com",
        api_key=os.environ.get("OPENAI_API_KEY"),
        model="text-embedding-3-large"
    )
    logger.info("Embeddings initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize embeddings: {e}")
    embeddings = None

# Initialize vector store
vector_store = None
if embeddings:
    try:
        vector_store = Chroma(
            collection_name="turbot_travel",
            embedding_function=embeddings,
            persist_directory="chroma"
        )
        logger.info("Vector store initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize vector store: {e}")

# Session management for context handling
user_sessions = {}

class TravelBot:
    def __init__(self):
        self.system_prompt = """
        Ti si TurBot, ekspert za turizam u Srbiji i međunarodna putovanja za srpske građane.
        
        Tvoja ekspertiza uključuje:
        - Srpske destinacije (Beograd, Novi Sad, Niš, planinske destinacije, spa centri, kulturna mesta)
        - Planiranje putovanja i itinereri
        - Preporuke za smeštaj u hotelima različitih kategorija
        - Lokalne specijalne i restorane
        - Opcije prevoza unutar Srbije i u inostranstvo
        - Kulturne manifestacije i festivale
        - Vize i putna dokumenta
        - Saveti za budžetska putovanja
        - Informacije o cenama u evrima i dinarima
        
        Uvek pružaj:
        - Tačne i korisne informacije na osnovu pruženog konteksta
        - Specifične preporuke sa praktičnim detaljima
        - Opcije prilagođene budžetu kada je to moguće
        - Kulturne uvide i lokalne savete
        - Informacije o cenama u evrima kad god je to relevantno
        
        Ako informacije nisu dostupne u kontekstu, jasno navedi to i predloži alternativne resurse.
        Odgovore drži koncizno ali informativno (2-4 rečenice osim ako nije potrebno više detalja).
        Uvek odgovaraj na srpskom jeziku.
        
        Kontekst: {context}
        """
        
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("human", "{input}")
        ])
        
        if vector_store and llm:
            self.question_answer_chain = create_stuff_documents_chain(llm, self.prompt)
            self.retrieval_chain = create_retrieval_chain(
                retriever=vector_store.as_retriever(search_kwargs={"k": 3}),
                combine_docs_chain=self.question_answer_chain
            )
        else:
            self.question_answer_chain = None
            self.retrieval_chain = None

# Initialize travel bot
travel_bot = TravelBot()

def generate_session_id():
    """Generate unique session ID"""
    return str(uuid.uuid4())

def get_or_create_session(session_id: Optional[str] = None) -> str:
    """Get existing session or create new one"""
    if not session_id:
        session_id = generate_session_id()
    
    if session_id not in user_sessions:
        user_sessions[session_id] = {
            'created_at': datetime.now(),
            'messages': [],
            'context': []
        }
    
    return session_id

def calculate_cost_estimate(input_tokens: int, output_tokens: int) -> float:
    """Calculate cost estimate for Azure OpenAI GPT-4o-mini"""
    # Azure OpenAI GPT-4o-mini pricing (approximate)
    input_cost = (input_tokens / 1000) * 0.00015  # $0.00015 per 1K input tokens
    output_cost = (output_tokens / 1000) * 0.0006  # $0.0006 per 1K output tokens
    return input_cost + output_cost

def validate_travel_content(text: str) -> bool:
    """Validate if content is travel/tourism related"""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in TRAVEL_KEYWORDS)

def search_external_sources(query: str) -> str:
    """Fallback response for external search (without SerpAPI dependency)"""
    try:
        # Simple web search using requests (basic implementation)
        # This is a fallback when SerpAPI is not available
        fallback_response = f"""
        Za detaljnije informacije o "{query}" preporučujem da proverite:
        - Zvaničnu web stranicu Turističke organizacije Srbije (www.serbia.travel)
        - Lokalne turističke organizacije
        - Specijalizovane turističke portale
        
        Mogu da pomognem sa opštim informacijama o turističkim destinacijama u Srbiji na osnovu dostupnih podataka.
        """
        return fallback_response.strip()
        
    except Exception as e:
        logger.error(f"External search error: {str(e)}")
        return "Spoljašnja pretraga trenutno nije dostupna. Molim vas da se obratite direktno turističkim organizacijama za najnovije informacije."

def generate_fallback_response(user_message: str) -> str:
    """Generate fallback response using basic LLM without RAG"""
    if not llm:
        return "Izvinjavam se, sistem trenutno nije dostupan. Molim vas pokušajte ponovo kasnije."
    
    try:
        fallback_prompt = ChatPromptTemplate.from_messages([
            ("system", """Ti si TurBot, turistički asistent za Srbiju. 
            Pružaj kratke, korisne odgovore o turističkim destinacijama, 
            smeštaju, restoranima i putovanjima u Srbiji. 
            Odgovaraj na srpskom jeziku u 2-3 rečenice."""),
            ("human", "{input}")
        ])
        
        chain = fallback_prompt | llm
        response = chain.invoke({"input": user_message})
        return response.content
        
    except Exception as e:
        logger.error(f"Fallback response error: {str(e)}")
        return "Izvinjavam se, trenutno imam problema sa odgovaranjem. Molim vas kontaktirajte turističke organizacije za tačne informacije."

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'llm_available': llm is not None,
        'vector_store_available': vector_store is not None
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message'].strip()
        session_id = get_or_create_session(data.get('session_id'))
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Add user message to session
        user_sessions[session_id]['messages'].append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now().isoformat()
        })
        
        start_time = datetime.now()
        
        # Try RAG first if available
        answer = None
        sources = []
        used_external_search = False
        
        if travel_bot.retrieval_chain:
            try:
                result = travel_bot.retrieval_chain.invoke({"input": user_message})
                answer = result.get("answer", "")
                
                # Extract sources
                if "context" in result:
                    sources = [doc.metadata.get("source", "Nepoznat izvor") for doc in result["context"]]
                
            except Exception as e:
                logger.error(f"RAG chain error: {str(e)}")
                answer = None
        
        # If RAG failed or no good answer, try fallback
        if not answer or len(answer.strip()) < 10:
            try:
                answer = generate_fallback_response(user_message)
                if not answer or len(answer.strip()) < 10:
                    answer = search_external_sources(user_message)
                    used_external_search = True
            except Exception as e:
                logger.error(f"Fallback response error: {str(e)}")
                answer = "Izvinjavam se, trenutno imam tehnička problema. Molim vas pokušajte ponovo za nekoliko trenutaka."
        
        # Calculate response time
        response_time = (datetime.now() - start_time).total_seconds()
        
        # Add bot response to session
        user_sessions[session_id]['messages'].append({
            'role': 'assistant',
            'content': answer,
            'timestamp': datetime.now().isoformat(),
            'sources': sources,
            'response_time': response_time
        })
        
        # Estimate cost (rough calculation)
        estimated_cost = calculate_cost_estimate(len(user_message) * 0.75, len(answer) * 0.75)
        
        return jsonify({
            'answer': answer,
            'session_id': session_id,
            'sources': sources,
            'response_time': response_time,
            'used_external_search': used_external_search,
            'estimated_cost': estimated_cost,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
@app.route('/api/upload', methods=['POST'])
def upload_document():
    """Upload and process travel document"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        allowed_extensions = {'txt', 'pdf'}
        if not ('.' in file.filename and 
                file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'error': 'Dozvoljeni su samo TXT i PDF fajlovi'}), 400
        
        # Secure filename
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        
        # Save file
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Process file based on type
        try:
            if filename.lower().endswith('.pdf'):
                loader = PyPDFLoader(filepath)
                documents = loader.load()
                content = "\n".join([doc.page_content for doc in documents])
            else:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
            
            # Validate content is travel-related
            if not validate_travel_content(content):
                os.remove(filepath)  # Clean up
                return jsonify({
                    'error': 'Dokument se ne odnosi na turizam/putovanja'
                }), 400
            
            # Extract structured data using LLM
            structured_data = extract_structured_data(content, filename)
            
            # Save to database
            db_saved = save_to_database(filename, structured_data, content)
            
            # Generate summary if LLM is available
            summary = "Dokument je uspešno otpremljen."
            if llm:
                try:
                    summary_prompt = ChatPromptTemplate.from_template(
                        "Sumiraj ovaj turističko/putni dokument u 3-4 rečenice, istakni ključne destinacije, usluge ili turističke informacije:\n\n{content}"
                    )
                    summary_chain = summary_prompt | llm
                    summary_result = summary_chain.invoke({"content": content[:3000]})
                    summary = summary_result.content
                except Exception as e:
                    logger.error(f"Summary generation error: {str(e)}")
            
            # Add to vector store if available
            docs = []
            if vector_store:
                try:
                    text_splitter = CharacterTextSplitter(
                        chunk_size=500,
                        chunk_overlap=50,
                        separator="\n"
                    )
                    
                    docs = text_splitter.split_documents([
                        Document(
                            page_content=content,
                            metadata={
                                "source": filename,
                                "upload_date": datetime.now().isoformat(),
                                "file_type": filename.split('.')[-1]
                            }
                        )
                    ])
                    
                    vector_store.add_documents(docs)
                except Exception as e:
                    logger.error(f"Vector store error: {str(e)}")
            
            return jsonify({
                'message': 'Dokument je uspešno otpremljen i obrađen',
                'filename': filename,
                'summary': summary,
                'structured_data': structured_data,
                'chunks_created': len(docs),
                'saved_to_database': db_saved,
                'upload_date': datetime.now().isoformat()
            })
            
        except Exception as e:
            # Clean up file on processing error
            if os.path.exists(filepath):
                os.remove(filepath)
            raise e
            
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Failed to process document'}), 500

@app.route('/api/upload/multiple', methods=['POST'])
def upload_multiple_documents():
    """Upload and process multiple travel documents"""
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400

        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            return jsonify({'error': 'No files selected'}), 400

        allowed_extensions = {'txt', 'pdf'}
        responses = []

        for file in files:
            if file.filename == '':
                responses.append({'filename': None, 'error': 'Empty filename'})
                continue

            if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                responses.append({
                    'filename': file.filename,
                    'error': 'Dozvoljeni su samo TXT i PDF fajlovi'
                })
                continue

            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            try:
                file.save(filepath)

                # Extract content
                if filename.lower().endswith('.pdf'):
                    loader = PyPDFLoader(filepath)
                    documents = loader.load()
                    content = "\n".join([doc.page_content for doc in documents])
                else:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()

                if not validate_travel_content(content):
                    os.remove(filepath)
                    responses.append({
                        'filename': filename,
                        'error': 'Dokument se ne odnosi na turizam/putovanja'
                    })
                    continue

                # Extract structured data
                structured_data = extract_structured_data(content, filename)
                
                # Save to database
                db_saved = save_to_database(filename, structured_data, content)

                summary = "Dokument je uspešno otpremljen."
                if llm:
                    try:
                        summary_prompt = ChatPromptTemplate.from_template(
                            "Sumiraj ovaj turističko/putni dokument u 3-4 rečenice, istakni ključne destinacije, usluge ili turističke informacije:\n\n{content}"
                        )
                        summary_chain = summary_prompt | llm
                        summary_result = summary_chain.invoke({"content": content[:3000]})
                        summary = summary_result.content
                    except Exception as e:
                        logger.error(f"Summary generation error for {filename}: {str(e)}")

                docs = []
                if vector_store:
                    try:
                        text_splitter = CharacterTextSplitter(
                            chunk_size=500,
                            chunk_overlap=50,
                            separator="\n"
                        )

                        docs = text_splitter.split_documents([Document(
                            page_content=content,
                            metadata={
                                "source": filename,
                                "upload_date": datetime.now().isoformat(),
                                "file_type": filename.split('.')[-1]
                            }
                        )])

                        vector_store.add_documents(docs)
                    except Exception as e:
                        logger.error(f"Vector store error for {filename}: {str(e)}")

                responses.append({
                    'filename': filename,
                    'message': 'Dokument je uspešno otpremljen i obrađen',
                    'summary': summary,
                    'structured_data': structured_data,
                    'chunks_created': len(docs),
                    'saved_to_database': db_saved,
                    'upload_date': datetime.now().isoformat()
                })

            except Exception as e:
                logger.error(f"Processing error for {filename}: {str(e)}")
                if os.path.exists(filepath):
                    os.remove(filepath)
                responses.append({'filename': filename, 'error': 'Greška pri obradi fajla'})

        return jsonify({'results': responses}), 207  # 207 Multi-Status

    except Exception as e:
        logger.error(f"Upload multiple error: {str(e)}")
        return jsonify({'error': 'Failed to process documents'}), 500

@app.route('/api/travel-packages', methods=['GET'])
def get_travel_packages():
    """Get all travel packages from database"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT id, filename, title, description, destinations, 
                       duration_days, duration_nights, transport_type,
                       dates, prices, hotels, includes, excludes, highlights,
                       created_at, updated_at
                FROM travel_packages 
                ORDER BY created_at DESC
            """)
            packages = cursor.fetchall()

            result = []
            for package in packages:
                package_dict = dict(package)
                for field in ['destinations', 'dates', 'prices', 'hotels', 'includes', 'excludes', 'highlights']:
                    if package_dict[field] is None:
                        package_dict[field] = []  # or {} based on structure
                result.append(package_dict)

            return jsonify({
                'packages': result,
                'total': len(result)
            })

    except Exception as e:
        logger.error(f"Get travel packages error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve travel packages'}), 500
    finally:
        if conn:
            conn.close()

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logger.info("Starting TurBot Flask API Server...")
    logger.info(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    logger.info(f"Data folder: {app.config['DATA_FOLDER']}")
    
    # Check environment variables
    if not os.environ.get("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not set - LLM functionality will be limited")
    
    # Check component availability
    logger.info(f"LLM available: {llm is not None}")
    logger.info(f"Embeddings available: {embeddings is not None}")
    logger.info(f"Vector store available: {vector_store is not None}")
    
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=os.environ.get('FLASK_ENV') == 'development'
    )