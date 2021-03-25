import * as faceapi from 'face-api.js'
import {storage} from './firebase'
import {useRef, useCallback, useState} from 'react'

//Load all the facial models into memory
export const loadModels = () => {
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
  ])
}

//run the facial Recognition when called after button click
export const runFacialRec = async () => {
  const detections = await faceapi
    .detectAllFaces('cam', new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceExpressions()
  if (detections.length) {
    console.log('Detected!')
    console.log(detections[0].expressions)
    //reactions.push(detections[0].expressions)
  } else {
    console.log('No Face here!')
  }
}

//upload any given file to fire storage. New feat: add a 2nd param for upload loc
export const handleUpload = file => {
  const today = new Date()
  const strDate = today.toISOString().substring(0, 10)
  const uploadTask = storage.ref(`recording/${strDate}.webm`).put(file)
  uploadTask.on(
    'state_changed',
    snapshop => {},
    error => {
      console.log(error)
    },
    () => {
      storage
        .ref()
        .child(`recording/${strDate}.webm`)
        .getDownloadURL()
        .then(url => {
          console.log('Url of uploaded video: ', url)
        })
    }
  )
}

//start recording when button is clicked
export const startRecording = (
  videoRef,
  mediaRecorderRef,
  handleDataAvailable
) => {
  console.log('started')
  mediaRecorderRef.current = new MediaRecorder(videoRef.current.stream, {
    mimeType: 'video/webm'
  })
  mediaRecorderRef.current.addEventListener(
    'dataavailable',
    handleDataAvailable
  )
  mediaRecorderRef.current.start()
  return mediaRecorderRef
}

//stop recording when button is clicked
export const stopRecording = mediaRecorderRef => {
  console.log('Stop Recording')
  mediaRecorderRef.current.stop()
  return mediaRecorderRef
  //console.log(reactions)
}

export const handleDownload = recordedChunks => {
  if (recordedChunks.length) {
    const blob = new Blob(recordedChunks, {
      type: 'video/webm'
    })
    const url = URL.createObjectURL(blob)
    handleUpload(blob)
    //console.log('blob url', url)
    const a = document.createElement('a')
    document.body.appendChild(a)
    a.style = 'display: none'
    a.href = url
    a.download = 'react-webcam-stream-capture.webm'
    a.click()
    window.URL.revokeObjectURL(url)
  }
}
