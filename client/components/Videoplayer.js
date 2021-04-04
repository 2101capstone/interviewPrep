import React, {useState, useEffect, useRef} from 'react'
import Webcam from 'react-webcam'
import SpeechToTextV2 from './SpeechToTextV2'
import scoring from './Scoring'
import {useAuth} from '../contexts/AuthContext'
import {Button} from 'react-bootstrap'
import {useHistory} from 'react-router-dom'
import {addToFirestore, addToStorage, pushToUserDoc} from './firebaseHelperFunc'
import {toast} from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  loadModels,
  runFacialRec,
  startRecording,
  stopRecording,
  handleDownload,
  drawFacePoints
} from './vidHelperFunc'
import {
  fillerWords,
  countFiller,
  recognition,
  randomQuestionGenerator
} from './speechHelperFunc'

const Videoplayer = () => {
  const history = useHistory()
  const {currentUser} = useAuth() //current user signed in
  const [isRecord, setisRecord] = useState(null) //isRecording
  const [showFace, setShowFace] = useState(null) //not connected
  const [faceId, setFaceId] = useState('')
  const [reactions, setReactions] = useState([])
  const [showTranscript, setShowTranscript] = useState(null)
  const [words, setWords] = useState([]) // TRANSCRIPT!
  const [docId, setDocId] = useState('')
  let [intervalId, setIntervalId] = useState('')
  const [recordedChunks, setRecordedChunks] = useState([])
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  let mediaRecorderRef = useRef(null)
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'

  //load models with first render
  useEffect(() => {
    loadModels()
  }, [])

  const handleDataAvailable = ({data}) => {
    if (data.size > 0) {
      setRecordedChunks(prev => prev.concat(data))
    }
  }

  //if isRecord, then run facial recognition, start recording
  useEffect(() => {
    if (isRecord) {
      //Start Recording
      setIntervalId(setInterval(runFacialRec, 200, reactions, setReactions))
      mediaRecorderRef = startRecording(
        videoRef,
        mediaRecorderRef,
        handleDataAvailable
      ) //start video recording
      recognition.start() //start voice Recognition
    } else if (isRecord === false) {
      //END RECORDING
      clearInterval(intervalId)
      mediaRecorderRef = stopRecording(mediaRecorderRef) //stop video recording
      recognition.stop() //ending voice rec
      const transcript = words.join(' ')
      countFiller(transcript)
      let score = scoring(words, fillerWords, reactions)
      addToFirestore({
        transcript,
        fillerWords,
        uid: currentUser.uid,
        score
      }).then(setDocId)
    }
  }, [isRecord])

  //upload video to cloud storage
  useEffect(() => {
    if (docId) {
      addToStorage(recordedChunks, docId)
      pushToUserDoc(currentUser.uid, docId)
      toast.info('Your OuterView has been saved')
    }
  }, [docId])

  //On/Off face net
  useEffect(() => {
    if (showFace) {
      setFaceId(setInterval(drawFacePoints, 200))
    } else if (showFace === false) {
      clearInterval(faceId)
      const canvas = document.getElementById('myCanvas')
      canvas.getContext('2d').clearRect(0, 0, 640, 480)
    }
  }, [showFace])

  //to download and submit video
  const handleDownloadClick = () => {
    handleDownload(recordedChunks)
    setRecordedChunks([])
  }

  // to join array of words from Transcription
  recognition.onresult = event => {
    setWords(
      Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
    )
  }

  return (
    <div className="video-div">
      <div className="camAndCanvas">
        <br></br>
        <canvas ref={canvasRef} id="myCanvas" />
        <Webcam
          ref={videoRef}
          audio={true}
          width={640}
          height={480}
          id="cam"
          className={isRecord ? 'recBorder' : 'noBorder'}
        />
      </div>
      <div className="details-buttons">
        {isRecord === false ? (
          <div>
            <button
              type="button"
              onClick={() => setisRecord(null)}
              className="buttonTwo"
            >
              Start Over
            </button>
            <button
              type="button"
              onClick={() =>
                history.push({
                  pathname: '/recordings',
                  state: {sessionId: docId}
                })
              }
              className="button"
            >
              View Analysis
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setisRecord(prevState => !prevState)}
            className="buttonTwo"
          >
            {isRecord ? 'End Recording' : 'Start Recording'}
          </button>
        )}
        {isRecord === false ? (
          <button
            type="button"
            onClick={handleDownloadClick}
            className="button"
          >
            Download
          </button>
        ) : (
          ''
        )}
        <button
          type="button"
          onClick={() => setShowFace(prevState => !prevState)}
          className="button"
        >
          Render Face Points
        </button>
        {isRecord === false ? (
          ''
        ) : (
          <button
            type="button"
            onClick={randomQuestionGenerator}
            className="button"
          >
            Random Interview Question
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowTranscript(prevState => !prevState)}
          className="button"
        >
          {showTranscript ? 'Hide Transcription' : 'Live Transcription'}
        </button>
      </div>
      {showTranscript ? (
        <div>
          <SpeechToTextV2 words={words} isRecord={isRecord} />
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}
export default Videoplayer
