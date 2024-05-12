import React, { useState } from 'react';
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

    return (
        <div className="container">
            <h1 className="logo"> in search of meaning</h1>
            <form onSubmit={addQA} className="qa-form">
                <input type="text" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Enter your question" />
                <input type="text" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Enter the answer" />
                <button type="submit">Add Q&A</button>
            </form>
            <div>
                {qaData.map((item, index) => (
                    <div key={index}>
                        <h3 className="question-answer">{item.question}</h3>
                        <p>{item.answer}</p>
                    </div>
                ))}
            </div>
            <footer className="footer">
                <em>by ngok <a href="https://github.com/ngokjeun">github</a></em>
            </footer>
        </div>
    );
}

export default App;
