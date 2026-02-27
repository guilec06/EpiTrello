import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <span>EpiTrello &copy; {new Date().getFullYear()}</span>
    </footer>
  )
}
