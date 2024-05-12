import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import './styles/App.css';
import './styles/Header.css';
import './styles/Footer.css';
import './styles/Forms.css';

function App() {
    const [qaData, setQaData] = useState([
        { question: 'What is React?', answer: 'A JavaScript library for building user interfaces.' },
        { question: 'Why use MongoDB?', answer: 'It\'s a non-relational database that provides high performance and easy scalability.' },
    ]);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef(null);

    const addQA = (e) => {
        e.preventDefault();
        if (question.trim() && answer.trim()) {
            const newQa = { question, answer };
            setQaData([...qaData, newQa]);
            setQuestion('');
            setAnswer('');
        } else {
            alert('Both question and answer are required.');
        }
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        Papa.parse(file, {
          header: true, 
          complete: (results) => {
            const data = results.data;
            if (data.length > 0) {
              const validData = data.filter((item) => item.questions && item.answers); 

              const formattedData = validData.map((item) => {
                return {
                  question: item.questions,
                  answer: item.answers,
                };
              });

              if (validData.length > 0) {
                setQaData(formattedData);
                setErrorMessage(''); 
              } else {
                setErrorMessage('Invalid CSV: Missing questions or answers in some rows.');
              }
            } else {
              setErrorMessage('Empty CSV file.');
            }
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            setErrorMessage('Error reading CSV file.');
          },
        });
      }
    };

    const handleButtonClick = () => {
      fileInputRef.current.click();
    }

    const filteredQaData = searchTerm
        ? qaData.filter(qa =>
            qa.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            qa.answer.toLowerCase().includes(searchTerm.toLowerCase()))
        : qaData;

    return (
      <div className="container">
      <h1 className="App-header">
        in search of <span class="subtle-glimmer">meaning</span>
      </h1>
        <div className="flex-container">
          <form onSubmit={addQA} className="qa-form">
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="enter question" />
            <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="enter answer" />
            <button type="submit">add q&a</button>
          </form>
      <div className="upload-section">
          <label htmlFor="upload-file">upload csv (questions & answers): </label>
          <div className="custom-file-upload">
            <input type="file" accept=".csv" id="upload-file" onChange={handleFileUpload} ref={fileInputRef} style={{ display: 'none' }} /> {/* Hide the input */}
            <button type="button" onClick={handleButtonClick}>choose file</button> {/* Add an onClick handler */}
          </div>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
    </div>
    <div className="search-section">
      <input type="text" placeholder="boring search :/" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
    </div>
    <div className="semantic-search-section">
      <input type="text" placeholder="semantic search!" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
    </div>
    <div>
      {filteredQaData.map((item, index) => (
        <div key={index}>
          <h3 className="question-answer">{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </div>
    
    <footer className="footer">
      <em>by ngok <a href="https://github.com/ngokjeun">github</a></em>
    </footer>
    <div class="disclaimer-container">
  <p class="disclaimer"><em>disclaimer:  AI did this.  seek truth elsewhere. <a href="https://en.wikipedia.org/wiki/Epistemology">ever heard of it?</a> all data publicly available.</em></p>
</div>


  </div>
);
}

export default App;
