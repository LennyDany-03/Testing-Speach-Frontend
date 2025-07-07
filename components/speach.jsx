"use client";

import React, { useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import ReactMarkdown from "react-markdown";

const SpeachComponent = () => {
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState("");

  const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
  const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

  const startRecognition = () => {
    setTranscript("");
    setFeedback("");
    setError("");
    setIsListening(true);

    if (!speechKey || !speechRegion) {
      setIsListening(false);
      setError("Azure Speech config missing. Check your .env.local.");
      return;
    }

    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        speechKey,
        speechRegion
      );
      speechConfig.speechRecognitionLanguage = "en-US";

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizeOnceAsync((result) => {
        setIsListening(false);

        if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          setTranscript(result.text);
          evaluateTranscript(result.text);
        } else {
          setError("Could not recognize speech. Try again.");
        }

        recognizer.close();
      });
    } catch (err) {
      setIsListening(false);
      setError("Error initializing speech recognition.");
    }
  };

  const evaluateTranscript = async (text) => {
    setIsEvaluating(true);
    setFeedback("");
    setError("");

    try {
      const res = await fetch("http://localhost:8000/api/speech/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      if (!res.ok) throw new Error("Failed to evaluate response.");

      const data = await res.json();
      setFeedback(data.feedback);
    } catch (err) {
      setError("Evaluation failed: " + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">🎤 IELTS Speaking Practice</h2>

      <button
        onClick={startRecognition}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        disabled={isListening || isEvaluating}
      >
        {isListening ? "Listening..." : isEvaluating ? "Evaluating..." : "Start Speaking"}
      </button>

      {transcript && (
        <div className="mt-4 bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Transcript:</h3>
          <p className="text-gray-800 whitespace-pre-line">{transcript}</p>
        </div>
      )}

      {feedback && (
        <div className="mt-6 bg-green-50 p-4 rounded border border-green-300">
          <h3 className="font-semibold mb-2">AI Evaluation:</h3>
          <div className="prose prose-sm">
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>

        </div>
      )}

      {error && <div className="mt-4 text-red-600 font-semibold">{error}</div>}
    </div>
  );
};

export default SpeachComponent;
