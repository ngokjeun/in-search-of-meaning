<template>
  <div class="app-container">
    <div class="hamburger-menu">
      <div class="hamburger-icon" @click="toggleMenu">
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div id="menu" :class="['menu-content', { open: menuOpen }]">
        <a href="#" @click="signIn">Sign In</a>
      </div>
    </div>
    <div v-if="!selectedCategory" :class="['landing-page', { 'fade-out': isFading }]">
      <h1>in search of <span class="subtle-glimmer">meaning</span></h1>
      <p class="instruction-text">choose question set</p>
      <div class="category-buttons">
        <button @click="handleCategoryClick('cpf faq')">cpf's faq</button>
        <button @click="handleCategoryClick('diy')">try your own!</button>
      </div>
    </div>
    <div v-else :class="['container', { 'fade-in': !isFading }]">
      <button @click="handleBackToMenu" class="back-button">menu</button>
      <h1 class="App-header">
        in search of <span class="subtle-glimmer">meaning</span>
      </h1>
      <div v-if="selectedCategory !== 'cpf faq'" class="flex-container">
        <form @submit.prevent="addQA" class="qa-form">
          <input type="text" v-model="question" placeholder="enter question" />
          <input type="text" v-model="answer" placeholder="enter answer" />
          <button type="submit">add q&a</button>
        </form>
        <div class="upload-section">
          <label for="upload-file">upload csv (questions & answers): </label>
          <div class="custom-file-upload">
            <input type="file" accept=".csv" id="upload-file" @change="handleFileUpload" ref="fileInputRef" style="display: none" />
            <button type="button" @click="handleButtonClick">choose file</button>
          </div>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>
      </div>
      <div class="search-section">
        <input
          type="text"
          placeholder="boring search :/"
          v-model="searchTerm"
          class="search-input"
        />
      </div>
      <div class="semantic-search-section">
        <input
          type="text"
          placeholder="semantic search!"
          v-model="semanticSearchTerm"
          class="search-input"
        />
      </div>
      <div>
        <div v-for="(item, index) in qaData" :key="index">
          <h3 class="question-answer">{{ item.question }}</h3>
          <p>{{ item.answer }}</p>
        </div>
      </div>
    </div>
    <footer :class="['footer', { 'fade-out': isFading, 'fade-in': !isFading }]">
      <em>by ngok <a href="https://github.com/ngokjeun">github</a></em>
      <div class="disclaimer-container">
        <p class="disclaimer"><em>disclaimer: AI did this. seek truth elsewhere. <a href="https://en.wikipedia.org/wiki/Epistemology">ever heard of it?</a> all data publicly available.</em></p>
      </div>
    </footer>
  </div>
</template>

<script>
import Papa from 'papaparse';
import axios from 'axios';
import './styles/App.css';

export default {
  data() {
    return {
      originalQaData: [],
      qaData: [],
      question: '',
      answer: '',
      searchTerm: '',
      semanticSearchTerm: '',
      errorMessage: '',
      selectedCategory: '',
      isFading: false,
      menuOpen: false,
    };
  },
  methods: {
    handleCategoryClick(category) {
      this.isFading = true;
      setTimeout(() => {
        this.selectedCategory = category;
        this.isFading = false;
        if (category === 'cpf faq') {
          this.fetchQaData();
        } else {
          this.qaData = [];
        }
      }, 300);
    },
    async fetchQaData() {
      console.log('Fetching QA data...');
      const cachedData = localStorage.getItem('qaData');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        console.log('Using cached data:', data);
        this.originalQaData = data;
        this.qaData = data;
      } else {
        try {
          const response = await axios.get('http://localhost:8000/get_qa_data');
          console.log('Data fetched from API:', response.data);
          this.originalQaData = response.data;
          this.qaData = response.data;
          localStorage.setItem('qaData', JSON.stringify(response.data));
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
    },
    addQA() {
      if (this.question.trim() && this.answer.trim()) {
        const newQa = { question: this.question, answer: this.answer };
        const updatedQaData = [...this.qaData, newQa];
        const updatedOriginalQaData = [...this.originalQaData, newQa];
        this.qaData = updatedQaData;
        this.originalQaData = updatedOriginalQaData;
        localStorage.setItem('qaData', JSON.stringify(updatedOriginalQaData));
        this.question = '';
        this.answer = '';
      } else {
        alert('Both question and answer are required.');
      }
    },
    handleFileUpload(event) {
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
                this.qaData = formattedData;
                this.originalQaData = formattedData;
                localStorage.setItem('qaData', JSON.stringify(formattedData));
                this.errorMessage = '';
              } else {
                this.errorMessage = 'Invalid CSV: Missing questions or answers in some rows.';
              }
            } else {
              this.errorMessage = 'Empty CSV file.';
            }
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            this.errorMessage = 'Error reading CSV file.';
          },
        });
      }
    },
    handleButtonClick() {
      this.$refs.fileInputRef.click();
    },
    async handleSemanticSearch() {
      if (this.semanticSearchTerm.trim() === '') return;
      console.log('Performing semantic search for:', this.semanticSearchTerm);
      try {
        const response = await axios.post('http://localhost:8000/find_most_similar_questions', {
          query: this.semanticSearchTerm,
          top_n: 5
        });
        this.qaData = response.data.results.map(item => ({
          question: item.question,
          answer: item.answer
        }));
      } catch (error) {
        console.error('Error performing semantic search:', error);
      }
    },
    handleBackToMenu() {
      this.isFading = true;
      setTimeout(() => {
        this.selectedCategory = '';
        this.isFading = false;
      }, 300);
    },
    performLocalSearch(term) {
      console.log('Performing local search for:', term);
      return this.originalQaData.filter(qa =>
        qa.question.toLowerCase().includes(term.toLowerCase()) ||
        qa.answer.toLowerCase().includes(term.toLowerCase())
      );
    },
    handleSearch() {
      const localResults = this.performLocalSearch(this.searchTerm);
      this.qaData = localResults;
    },
    toggleMenu() {
      this.menuOpen = !this.menuOpen;
    },
    signIn() {
      alert('Sign In clicked');
    },
    debounce(func, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    }
  },
  watch: {
    semanticSearchTerm() {
      this.debounceSemanticSearch();
    },
    searchTerm() {
      this.debounceSearch();
    }
  },
  created() {
    this.debounceSemanticSearch = this.debounce(this.handleSemanticSearch, 200);
    this.debounceSearch = this.debounce(this.handleSearch, 200);
    this.fetchQaData();
  }
};
</script>
