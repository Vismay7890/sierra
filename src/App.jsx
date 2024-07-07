import React, { useEffect, useRef, useState } from 'react';
import './OrbAnimation.css';
import { generateOrbCSS } from './generateOrbCSS';

const OrbAnimation = () => {
  const orbRef = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [responseReceived, setResponseReceived] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [blastPending, setBlastPending] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false); // Track playing/streaming audio state

  useEffect(() => {
    const setupAudio = async () => {
      try {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 2048;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.current.createMediaStreamSource(stream);
        source.connect(analyser.current);

        animateOrbWithAudio();
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    generateOrbCSS();
    setupAudio();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animateOrbWithAudio = () => {
    if (!analyser.current) return;

    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    let speakingTimeout;

    const updateAnimation = () => {
      analyser.current.getByteFrequencyData(dataArray);
      const averageFrequency = getAverageFrequency(dataArray);

      if (averageFrequency > 0) {
        clearTimeout(speakingTimeout);
        speakingTimeout = setTimeout(() => {
          stopRecognition();
        }, 1000);

        if (!isSpeaking) {
          setIsSpeaking(true);
          setBlastPending(false);
        }
      } else {
        if (isSpeaking && !blastPending) {
          setIsSpeaking(false);
          setBlastPending(true);
          blastOrb();
        }
      }

      const scaleFactor = 1 + averageFrequency / 200;

      if (orbRef.current) {
        orbRef.current.style.transform = `scale(${scaleFactor})`;
      }

      requestAnimationFrame(updateAnimation);
    };

    updateAnimation();
  };

  const getAverageFrequency = (dataArray) => {
    const sum = dataArray.reduce((acc, val) => acc + val, 0);
    return sum / dataArray.length;
  };

  const blastOrb = () => {
    if (orbRef.current) {
      orbRef.current.classList.add('blast');
      setTimeout(() => {
        orbRef.current.classList.remove('blast');
        setBlastPending(false); // Reset blast pending state
      }, 1000); // Adjust timing based on your blast animation
    }
  };

  const handleOrbClick = () => {
    if (!recognitionActive) {
      startRecognition();
    }
  };

  const startRecognition = async () => {
    setRecognitionActive(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/recognize_speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();

      if (data.success) {
        processChat(data.transcription);
      }
    } catch (error) {
      console.error('Error recognizing speech:', error);
    } finally {
      setRecognitionActive(false);
    }
  };

  const stopRecognition = () => {
    setRecognitionActive(false);
  };

  const processChat = async (userInput) => {
    const response = await fetch("http://127.0.0.1:5000/api/process_chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user_input: userInput, chat_history: [] })
    });
    const data = await response.json();

    speakResponse(data.response);
  };

  const speakResponse = async (responseText) => {
    setIsPlayingAudio(true); // Set state to indicate playing/streaming audio

    const response = await fetch("http://127.0.0.1:5000/api/text_to_speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: responseText })
    });

    if (response.ok) {
      const audio = new Audio(URL.createObjectURL(await response.blob()));
      audio.play();
      setResponseReceived(true);
      audio.addEventListener('ended', () => {
        setIsPlayingAudio(false); // Reset state after audio ends
      });
    }
  };

  useEffect(() => {
    if (responseReceived) {
      setTimeout(() => {
        setResponseReceived(false);
      }, 3000);
    }
  }, [responseReceived]);

  return (
    <div className={`wrap ${recognitionActive ? 'listening' : ''} ${responseReceived ? 'response-received' : ''}`} onClick={handleOrbClick}>
      <div className={`particles ${isPlayingAudio ? 'playing-audio' : ''}`} ref={orbRef}>
        {Array.from({ length: 300 }).map((_, index) => (
          <div key={index} className="c" />
        ))}
      </div>
    </div>
  );
};

export default OrbAnimation;
