import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import './styles/App.css';
import './styles/Header.css';
import './styles/Footer.css';
import './styles/Forms.css';
import './styles/Footer.css'; // Import the footer styles

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
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isFading, setIsFading] = useState(false);
    
    const handleCategoryClick = (category) => {
        setIsFading(true);
        setTimeout(() => {
            setSelectedCategory(category);
            setIsFading(false);
        }, 300); 
    };

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
    };

    const filteredQaData = searchTerm
        ? qaData.filter(qa =>
            qa.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            qa.answer.toLowerCase().includes(searchTerm.toLowerCase()))
        : qaData;

    const handleBackToMenu = () => {
        setIsFading(true);
        setTimeout(() => {
            setSelectedCategory('');
            setIsFading(false);
        }, 300); 
    };

    return (
        <div className="app-container">
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
