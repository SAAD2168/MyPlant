from flask import Flask, request, jsonify, send_file
import tensorflow as tf
import numpy as np
import os
from PIL import Image
import io
from flask_cors import CORS
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Constants
MODEL_PATH = os.path.join('model', 'model.tflite')  # Update this path to your TFLite model
# Model expects 32x32 input images
#IMG_SIZE = (32, 32)

# Model expects 128x128 input images
IMG_SIZE = (128, 128)

DATABASE_PATH = 'predictions.db'  # Database in root directory

# Class labels for predictions
CLASS_LABELS = [
    'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 
    'Apple___healthy', 'Blueberry___healthy', 'Cherry_(including_sour)___healthy',
    'Cherry_(including_sour)___Powdery_mildew', 
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn_(maize)___Common_rust_',
    'Corn_(maize)___healthy', 'Corn_(maize)___Northern_Leaf_Blight', 
    'Grape___Black_rot', 'Grape___Esca_(Black_Measles)', 'Grape___healthy',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 
    'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot',
    'Peach___healthy', 'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy',
    'Potato___Early_blight', 'Potato___healthy', 'Potato___Late_blight',
    'Raspberry___healthy', 'Soybean___healthy', 'Squash___Powdery_mildew',
    'Strawberry___healthy', 'Strawberry___Leaf_scorch', 'Tomato___Bacterial_spot',
    'Tomato___Early_blight', 'Tomato___healthy', 'Tomato___Late_blight',
    'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot',
    'Tomato___Tomato_mosaic_virus', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus'
]

# Global variables to store the TFLite interpreter and input/output details
interpreter = None
input_details = None
output_details = None

def initialize_model():
    """Initialize the TFLite model at startup"""
    global interpreter, input_details, output_details
    try:
        # Load TFLite model and allocate tensors
        interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()

        # Get input and output tensors
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        
        print("TFLite Model loaded successfully at startup!")
        return True
    except Exception as e:
        print(f"Error loading TFLite model at startup: {str(e)}")
        return False

# Initialize model when the file is loaded
if not initialize_model():
    raise RuntimeError("Failed to initialize TFLite model at startup")

def preprocess_image(image):
    # Resize image
    image = image.resize(IMG_SIZE)
    # Convert to array and add batch dimension
    image_array = np.array(image)
    # Normalize
    image_array = image_array.astype('float32') / 255.0
    # Add batch dimension
    image_array = np.expand_dims(image_array, axis=0)
    return image_array

def run_inference(processed_image):
    """Run inference using TFLite model"""
    global interpreter, input_details, output_details
    
    # Set input tensor
    interpreter.set_tensor(input_details[0]['index'], processed_image)
    
    # Run inference
    interpreter.invoke()
    
    # Get output tensor
    output_data = interpreter.get_tensor(output_details[0]['index'])
    return output_data

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    try:
        # Get the image file
        file = request.files['file']
        image = Image.open(io.BytesIO(file.read())).convert('RGB')
        
        # Preprocess the image
        processed_image = preprocess_image(image)
        
        # Run inference
        predictions = run_inference(processed_image)
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx] * 100)

        result = {
            'predicted_class': CLASS_LABELS[predicted_class_idx],
            'confidence': f"{confidence:.2f}%"
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def init_db():
    """Initialize the SQLite database and create the predictions table if it doesn't exist"""
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            confidence REAL NOT NULL,
            image_data BLOB,
            timestamp TEXT DEFAULT (datetime('now', 'localtime', '+1 hour')),
            latitude REAL,
            longitude REAL
        )
    ''')
    conn.commit()
    conn.close()

def save_prediction(label, confidence, image, latitude=None, longitude=None):
    """Save a prediction to the database with the image and location data"""
    # Convert image to bytes
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='PNG')
    img_byte_arr = img_byte_arr.getvalue()

    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    c.execute('''INSERT INTO predictions 
                 (label, confidence, image_data, latitude, longitude, timestamp) 
                 VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime', '+1 hour'))''',
              (label, confidence, img_byte_arr, latitude, longitude))
    conn.commit()
    conn.close()

# Initialize database when the file is loaded
init_db()

@app.route('/predict3', methods=['POST'])
def predict3():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    try:
        # Get location data from the request
        latitude = float(request.form['latitude']) if 'latitude' in request.form else None
        longitude = float(request.form['longitude']) if 'longitude' in request.form else None
        
        # Get the image file
        file = request.files['file']
        image = Image.open(io.BytesIO(file.read())).convert('RGB')
        
        # Keep a copy of the original image for storage
        original_image = image.copy()
        
        # Preprocess the image
        processed_image = preprocess_image(image)
        
        # Run inference
        predictions = run_inference(processed_image)
        
        # Get top 3 predictions
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        results = []
        
        # Get the highest confidence prediction (first in top 3)
        max_confidence = float(predictions[0][top_3_idx[0]])
        max_label = CLASS_LABELS[top_3_idx[0]]
        
        # Save the highest confidence prediction to the database along with the image and location
        save_prediction(max_label, max_confidence, original_image, latitude, longitude)
        
        for idx in top_3_idx:
            confidence = float(predictions[0][idx])
            result = {
                'label': CLASS_LABELS[idx],
                'confidence': confidence
            }
            results.append(result)

        return jsonify({'predictions': results})

    except Exception as e:
        print(f"Error in predict3: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_prediction_image/<int:prediction_id>', methods=['GET'])
def get_prediction_image(prediction_id):
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute('SELECT image_data FROM predictions WHERE id = ?', (prediction_id,))
        result = c.fetchone()
        conn.close()

        if result is None:
            return jsonify({'error': 'Prediction not found'}), 404

        image_data = result[0]
        response = send_file(
            io.BytesIO(image_data),
            mimetype='image/png',
            as_attachment=False,
            download_name=f'prediction_{prediction_id}.png'
        )
        
        # Add CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_predictions_history', methods=['GET'])
def get_predictions_history():
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        
        # Get all predictions ordered by timestamp (most recent first)
        c.execute('''
            SELECT id, label, confidence, timestamp, latitude, longitude 
            FROM predictions 
            ORDER BY timestamp DESC
        ''')
        
        predictions = []
        for row in c.fetchall():
            prediction = {
                'id': row[0],
                'label': row[1],
                'confidence': row[2],
                'timestamp': row[3],
                'latitude': row[4],
                'longitude': row[5],
                'image_url': f'/get_prediction_image/{row[0]}'
            }
            predictions.append(prediction)
            
        conn.close()
        return jsonify({'predictions': predictions})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def test_model(image_path):
    """
    Test function to verify TFLite model functionality.
    Args:
        image_path: Path to test image
    """
    try:
        # Load and preprocess image
        image = Image.open(image_path).convert('RGB')
        processed_image = preprocess_image(image)

        # Run inference
        predictions = run_inference(processed_image)
        
        # Get top 5 predictions
        top_5_idx = np.argsort(predictions[0])[-5:][::-1]
        print("\nTop 5 Predictions:")
        print("-----------------")
        for idx in top_5_idx:
            confidence = float(predictions[0][idx] * 100)
            print(f"Class: {CLASS_LABELS[idx]}")
            print(f"Confidence: {confidence:.2f}%\n")

    except Exception as e:
        print(f"Error during testing: {str(e)}")

if __name__ == '__main__':
    # Example of how to use the test function
    #test_model('/path/to/test/image.jpg')
    
    # Start the Flask server
    app.run(host='0.0.0.0', port=5000) 