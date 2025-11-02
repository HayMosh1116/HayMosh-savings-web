// === Imports ===
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// === DOM Elements ===
const loginBtn = document.getElementById("google-login");
const logoutBtn = document.getElementById("logout");
const welcomeText = document.getElementById("welcome-text");
const dateEl = document.getElementById("date");
const balanceEl = document.getElementById("balance");
const amountInput = document.getElementById("amount");
const historyList = document.getElementById("history-list");
const goalInput = document.getElementById("goal-input");
const progressPercent = document.getElementById("progress-percent");
const goalText = document.getElementById("goal-text");
const circle = document.querySelector(".circle");

let userId = null;
let balance = 0;
let goal = 100000;
let history = [];

// === Display today's date ===
const today = new Date().toLocaleDateString();
if (dateEl) dateEl.textContent = `📅 ${today}`;

// === Auth: Login ===
loginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(window.auth, window.provider);
    const user = result.user;
    userId = user.uid;
    welcomeText.textContent = `👋 Welcome, ${user.displayName || "User"}!`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    loadData(); // Load user data immediately
  } catch (error) {
    alert("Login failed: " + error.message);
  }
});

// === Auth: Logout ===
logoutBtn.addEventListener("click", async () => {
  await signOut(window.auth);
  userId = null;
  balance = 0;
  goal = 100000;
  history = [];
  updateUI();
  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";
  welcomeText.textContent = "Welcome to My Savings App";
});

// === Detect login state ===
onAuthStateChanged(window.auth, (user) => {
  if (user) {
    userId = user.uid;
    welcomeText.textContent = `👋 Welcome, ${user.displayName || "User"}!`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    loadData();
  } else {
    userId = null;
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    welcomeText.textContent = "Welcome to My Savings App";
  }
});

// === App Logic ===

// Save button
document.getElementById("save-btn").addEventListener("click", () => {
  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) return alert("Enter a valid amount!");
  balance += amount;
  addHistory("Saved", amount);
});

// Withdraw button
document.getElementById("withdraw-btn").addEventListener("click", () => {
  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) return alert("Enter a valid amount!");
  if (amount > balance) return alert("Insufficient balance!");
  balance -= amount;
  addHistory("Withdrawn", amount);
});

// Reset button
document.getElementById("reset-btn").addEventListener("click", () => {
  if (confirm("Are you sure you want to reset everything?")) {
    balance = 0;
    history = [];
    saveData();
    updateUI();
  }
});

// Add record to history
function addHistory(type, amount) {
  const now = new Date();
  const record = {
    type,
    amount,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
  history.unshift(record);
  saveData();
  updateUI();
}

// === UI Updates ===
function updateUI() {
  if (balanceEl) balanceEl.textContent = `₦${balance.toLocaleString()}`;
  if (historyList) {
    historyList.innerHTML = history
      .map(
        (h) => `
      <li class="${h.type.toLowerCase()}">
        <div>
          <b>${h.type === "Saved" ? "💰" : "💸"} ${h.type}:</b> ₦${h.amount.toLocaleString()}
          <br>
          <small>${h.date} — ${h.time}</small>
        </div>
      </li>`
      )
      .join("");
  }
  if (amountInput) amountInput.value = "";
  updateProgress();
}

function updateProgress() {
  const percent = Math.min((balance / goal) * 100, 100);
  if (circle)
    circle.style.background = `conic-gradient(
      #00ffcc ${percent * 3.6}deg,
      #444 ${percent * 3.6}deg
    )`;
  if (progressPercent)
    progressPercent.textContent = `${Math.round(percent)}%`;
  if (goalText) goalText.textContent = `Goal: ₦${goal.toLocaleString()}`;
}

// === Save to Firestore ===
async function saveData() {
  if (!userId) {
    console.warn("User not logged in — skipping save.");
    return;
  }
  try {
    await setDoc(doc(window.db, "savings", userId), {
      balance,
      goal,
      history,
    });
    console.log("✅ Data saved to Firestore!");
  } catch (err) {
    console.error("❌ Error saving:", err);
  }
}

// === Load from Firestore ===
async function loadData() {
  if (!userId) return;
  try {
    const docSnap = await getDoc(doc(window.db, "savings", userId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      balance = data.balance || 0;
      goal = data.goal || 100000;
      history = data.history || [];
      updateUI();
      console.log("✅ Data loaded from Firestore");
    } else {
      console.log("No previous data found");
    }
  } catch (err) {
    console.error("❌ Error loading:", err);
  }
}

// === Goal Button ===
document.getElementById("set-goal-btn").addEventListener("click", () => {
  const newGoal = parseFloat(goalInput.value);
  if (isNaN(newGoal) || newGoal <= 0) {
    alert("Please enter a valid goal amount.");
    return;
  }
  goal = newGoal;
  saveData();
  updateProgress();
  goalInput.value = "";
});
