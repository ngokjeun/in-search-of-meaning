<template>
  <div class="sign-in-form">
    <h2>Sign In</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" v-model="email" required>
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" v-model="password" required>
      </div>
      <button type="submit">Sign In</button>
    </form>
  </div>
</template>

<script>
const app = {
  data() {
    return {
      email: '',
      password: '',
    };
  },
  methods: {
    handleSubmit() {
      // send API request to backend to authenticate
      console.log('Sign in clicked:', this.email, this.password);
      // Clear after submission
      this.email = '';
      this.password = '';
    },
  },
};
export default app;
</script>

<style scoped>
.sign-in-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #292e42;
  color: #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
}

.form-group {
  margin-bottom: 10px;
  width: 100%;
}

label {
  display: block;
  margin-bottom: 5px;
  color: #e0e0e0;
}

input {
  padding: 10px;
  border: 1px solid #545c7e;
  border-radius: 5px;
  width: 100%;
  background-color: #292e42;
  color: #e0e0e0;
}

input:focus {
  border-color: #bb9af7;
}

button {
  padding: 10px 20px;
  background-color: #414868;
  border: none;
  border-radius: 5px;
  color: #e0e0e0;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #565f89;
  color: #bb9af7;
}
</style>
