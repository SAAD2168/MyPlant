FROM python:3.9-slim-buster
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN mkdir -p /app/data
COPY . .
EXPOSE 5000

#  IMPORTANT: The model will be loaded from /app/model/ via a volume.
#           Make sure server.py is updated accordingly!

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "server_tflite:app"]