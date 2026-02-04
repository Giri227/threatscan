# TensorFlow Malware Detection Model

This directory contains the TensorFlow.js model for malware classification.

## Model Architecture

- **Input Layer**: 6 normalized features
  - File size
  - Entropy
  - Suspicious string count
  - Import count
  - Section count
  - Maximum section entropy

- **Hidden Layers**:
  - Dense(64, relu) + Dropout(0.3)
  - Dense(32, relu) + Dropout(0.2)
  - Dense(16, relu)

- **Output Layer**: Dense(1, sigmoid) - Binary classification probability

## Training

The model is currently untrained and will use random weights. To train the model:

1. Collect training data (malware and benign samples)
2. Extract features using the feature extraction pipeline
3. Use the `train()` method in `tensorflowModel.js`

Example:
```javascript
const { tensorflowModel } = require('./src/engine/tensorflowModel');

// Training data: array of normalized feature vectors
const trainingData = [...];
const labels = [...]; // 1 for malware, 0 for benign

await tensorflowModel.loadModel();
await tensorflowModel.train(trainingData, labels, 50); // 50 epochs
await tensorflowModel.saveModel();
```

## Uncertainty Quantification

The model uses Monte Carlo Dropout for uncertainty estimation:
- Runs 20 forward passes with dropout enabled
- Calculates mean and variance of predictions
- Higher variance = higher uncertainty

## Future Improvements

- [ ] Train on real malware dataset (VirusShare, MalwareBazaar)
- [ ] Implement transfer learning from pre-trained models
- [ ] Add more sophisticated features (control flow graphs, API call sequences)
- [ ] Implement online learning for continuous improvement
