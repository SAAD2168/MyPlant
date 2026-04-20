# MyPlant: Web-App with A Lightweight CNN for Plant Disease Detection

This repository contains the official implementation of the **MyPlant** framework, a lightweight deep learning solution optimized for edge computing.

## Quick Start with Docker

The easiest way to reproduce our results is using Docker, which handles all dependencies (TensorFlow, OpenCV, etc.) automatically.

### 1. Clone the repository

Open your terminal and run:

```bash
git clone https://github.com/SAAD2168/MyPlant.git
cd myplant
```

### 2. Deploy using Docker Compose

Build the image and start the container with a single command:

```bash
docker-compose up –build
```
## Lightweight CNN Model Key Features

* **Model Efficiency:** Optimized CNN architecture using depth-wise decomposition, Squeeze-and-Excitation attention modules, and the Hard-Swish activation function.

* **Low Footprint:** Specifically designed to run within strict RAM and thermal constraints of embedded devices.

* **Dataset:** Validated on the **PlantVillage** dataset for robust multi-class plant disease classification.