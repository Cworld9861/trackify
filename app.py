import os
import logging
from flask import Flask, send_file, request, jsonify, send_from_directory, redirect
import uuid

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug("Initializing Flask application")

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key = os.environ.get("SESSION_SECRET", "trackify_secret_key")
# Enable Flask debugging
app.debug = True
# Configure for broad accessibility
app.config['PREFERRED_URL_SCHEME'] = 'http'
# Ensure response headers are set correctly
@app.after_request
def add_header(response):
    logger.debug(f"Processing response: {response}")
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/tasks')
def tasks():
    return redirect('/tasks.html')

@app.route('/tasks.html')
def tasks_html():
    return send_file('tasks.html')

@app.route('/habits')
def habits():
    return redirect('/habits.html')

@app.route('/habits.html')
def habits_html():
    return send_file('habits.html')

@app.route('/timer')
def timer():
    return redirect('/timer.html')

@app.route('/timer.html')
def timer_html():
    return send_file('timer.html')

@app.route('/courses')
def courses():
    return redirect('/courses.html')

@app.route('/courses.html')
def courses_html():
    return send_file('courses.html')

@app.route('/analytics')
def analytics():
    return redirect('/analytics.html')

@app.route('/analytics.html')
def analytics_html():
    return send_file('analytics.html')

@app.route('/settings')
def settings():
    return redirect('/settings.html')

@app.route('/settings.html')
def settings_html():
    return send_file('settings.html')

@app.route('/upload-file', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file:
        # Check file extension
        allowed_extensions = ['pdf', 'docx', 'ppt', 'pptx', 'txt']
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Return the path to the file
        file_url = f"/static/uploads/{unique_filename}"
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': file.filename,
            'fileUrl': file_url
        })

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/sw.js')
def service_worker():
    return send_from_directory('static/js', 'sw.js')

@app.route('/health')
def health_check():
    logger.debug("Health check endpoint accessed")
    return jsonify({"status": "ok", "message": "Server is running"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
