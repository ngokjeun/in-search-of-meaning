import React, { useState, useRef, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import axios from 'axios';
import './styles/App.css';
import './styles/Header.css';
import './styles/Footer.css';
import './styles/Forms.css';
import './styles/Footer.css'; // Import the footer styles
import './styles/Menu.css';

function App() {
  const [originalQaData, setOriginalQaData] = useState([]);
  const [qaData, setQaData] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [semanticSearchTerm, setSemanticSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isFading, setIsFading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);


  useEffect(() => {
    if (selectedCategory === 'cpf faq') {
      fetchQaData();
    } else if (selectedCategory === 'diy') {
      setQaData([]);
    }
  }, [selectedCategory]);

  const handleCategoryClick = (category) => {
    setIsFading(true);
    setTimeout(() => {
      setSelectedCategory(category);
      setIsFading(false);
    }, 300);
  };

  const fetchQaData = async () => {
    const cachedData = localStorage.getItem('qaData');
    if (cachedData) {
      const data = JSON.parse(cachedData);
      setOriginalQaData(data);
      setQaData(data);
    } else {
      try {
        const response = await axios.get('http://localhost:8000/get_qa_data');
        setOriginalQaData(response.data);
        setQaData(response.data);
        localStorage.setItem('qaData', JSON.stringify(response.data));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
  };

  const addQA = (e) => {
    e.preventDefault();
    if (question.trim() && answer.trim()) {
      const newQa = { question, answer };
      const updatedQaData = [...qaData, newQa];
      const updatedOriginalQaData = [...originalQaData, newQa];
      setQaData(updatedQaData);
      setOriginalQaData(updatedOriginalQaData);
      localStorage.setItem('qaData', JSON.stringify(updatedOriginalQaData));
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

            const formattedData = validData.map((item) => ({
              question: item.questions,
              answer: item.answers,
            }));

            if (validData.length > 0) {
              setQaData(formattedData);
              setOriginalQaData(formattedData);
              localStorage.setItem('qaData', JSON.stringify(formattedData));
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
  };

  const handleSemanticSearch = useCallback(async () => {
    if (semanticSearchTerm.trim() === '') return;
    try {
      const response = await axios.post('http://localhost:8000/find_most_similar_questions', {
        query: semanticSearchTerm,
        top_n: 5
      });
      setQaData(response.data.results.map(item => ({
        question: item.question,
        answer: item.answer
      })));
    } catch (error) {
      console.error('Error performing semantic search:', error);
    }
  }, [semanticSearchTerm]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      handleSemanticSearch();
    }, 200);

    return () => clearTimeout(debounceTimeout);
  }, [semanticSearchTerm, handleSemanticSearch]);

  const handleBackToMenu = () => {
    setIsFading(true);
    setTimeout(() => {
      setSelectedCategory('');
      setIsFading(false);
    }, 300);
  };

  const performLocalSearch = useCallback((term) => {
    return originalQaData.filter(qa =>
      qa.question.toLowerCase().includes(term.toLowerCase()) ||
      qa.answer.toLowerCase().includes(term.toLowerCase())
    );
  }, [originalQaData]);

  const handleSearch = useCallback(() => {
    const localResults = performLocalSearch(searchTerm);
    setQaData(localResults);
  }, [performLocalSearch, searchTerm]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      handleSearch();
    }, 200);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, handleSearch]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const signIn = () => {
    alert('Sign In clicked');
  };
  return (
    <div className="app-container">
      <div className="hamburger-menu">
        <div className="hamburger-icon" onClick={toggleMenu}>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div id="menu" className={`menu-content ${menuOpen ? 'open' : ''}`}>
          <a href="#" onClick={signIn}>Sign In</a>
        </div>
      </div>
      {!selectedCategory ? (
        <div className={`landing-page ${isFading ? 'fade-out' : ''}`}>
          <h1>in search of <span className="subtle-glimmer">meaning</span></h1>
          <p className="instruction-text">choose question set</p>
          <div className="category-buttons">
            <button onClick={() => handleCategoryClick('cpf faq')}>cpf's faq</button>
            <button onClick={() => handleCategoryClick('diy')}>try your own!</button>
          </div>
        </div>
      ) : (
        <div className={`container ${isFading ? '' : 'fade-in'}`}>
          <button onClick={handleBackToMenu} className="back-button">menu</button>
          <h1 className="App-header">
            in search of <span className="subtle-glimmer">meaning</span>
          </h1>
          {selectedCategory !== 'cpf faq' && (
            <div className="flex-container">
              <form onSubmit={addQA} className="qa-form">
                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="enter question" />
                <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="enter answer" />
                <button type="submit">add q&a</button>
              </form>
              <div className="upload-section">
                <label htmlFor="upload-file">upload csv (questions & answers): </label>
                <div className="custom-file-upload">
                  <input type="file" accept=".csv" id="upload-file" onChange={handleFileUpload} ref={fileInputRef} style={{ display: 'none' }} />
                  <button type="button" onClick={handleButtonClick}>choose file</button>
                </div>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
              </div>
            </div>
          )}

          <div className="search-section">
            <input
              type="text"
              placeholder="boring search :/"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="semantic-search-section">
            <input
              type="text"
              placeholder="semantic search!"
              value={semanticSearchTerm}
              onChange={(e) => setSemanticSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div>
            {qaData.map((item, index) => (
              <div key={index}>
                <h3 className="question-answer">{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <footer className={`footer ${isFading ? 'fade-out' : 'fade-in'}`}>
        <em>by ngok <a href="https://github.com/ngokjeun">github</a></em>
        <div className="disclaimer-container">
          <p className="disclaimer"><em>disclaimer: AI did this. seek truth elsewhere. <a href="https://en.wikipedia.org/wiki/Epistemology">ever heard of it?</a> all data publicly available.</em></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
