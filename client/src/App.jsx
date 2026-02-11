import { Routes, Route } from 'react-router-dom'
import './App.css'

function Home() {
  return (
    <div className="home">
      <h1>EpiTrello</h1>
      <p>Your boards will appear here.</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}
