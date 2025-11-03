// ===== IMPORT FIREBASE MODULES =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";


// ===== DOM ELEMENTS =====
const dateEl = document.getElementById("date");
const balanceEl = document.getElementById("balance");
const amountInput = document.getElementById("amount");
const historyList = document.getElementById("history-list");
const percentText = document.getElementById("progress-percent");
const goalText = document.getElementById("goal-text");
const circle = document.querySelector(".circle");
const welcomeBanner = document.getElementById("welcome-banner");

// Auth
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userName = document.getElementById("user-name");
const userPhoto = document.getElementById("user-photo");

// ===== LOCAL VARIABLES =====
let goal = parseFloat(localStorage.getItem("goal")) || 100000;
let balance = parseFloat(localStorage.getItem("balance")) || 0;
let history = JSON.parse(localStorage.getItem("history")) || [];

// Display today’s date
dateEl.textContent = "📅 " + new Date().toLocaleDateString();

// ===== CORE FUNCTIONS =====
function updateUI() {
  balanceEl.textContent = `₦${balance.toLocaleString()}`;
  historyList.innerHTML = history.map(h => `
    <li class="${h.type.toLowerCase()}">
      <div>
        <b>${h.type === "Saved" ? "💰" : "💸"} ${h.type}:</b> ₦${h.amount.toLocaleString()}<br>
        <small>${h.date} — ${h.time}</small>
      </div>
    </li>`).join("");
  amountInput.value = "";
  updateProgress();
}

function addHistory(type, amount) {
  const now = new Date();
  const record = {
    type,
    amount,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
  history.unshift(record);
  saveData();
  updateUI();
}

function updateProgress() {
  const percent = Math.min((balance / goal) * 100, 100);
  circle.style.background = `conic-gradient(#00ffcc ${percent * 3.6}deg, #444 ${percent * 3.6}deg)`;
  percentText.textContent = `${Math.round(percent)}%`;
  goalText.textContent = `Goal: ₦${goal.toLocaleString()}`;
}

async function saveData() {
  localStorage.setItem("balance", balance);
  localStorage.setItem("history", JSON.stringify(history));
  localStorage.setItem("goal", goal);

  const user = auth.currentUser;
  if (user) {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { balance, history, goal }, { merge: true });
  }
}

async function loadUserData(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    balance = data.balance || 0;
    history = data.history || [];
    goal = data.goal || 100000;
    updateUI();
  }
}

// ===== BUTTON ACTIONS =====
document.getElementById("save-btn").addEventListener("click", () => {
  const amt = parseFloat(amountInput.value);
  if (!amt || amt <= 0) return alert("Enter a valid amount!");
  balance += amt;
  addHistory("Saved", amt);
});

document.getElementById("withdraw-btn").addEventListener("click", () => {
  const amt = parseFloat(amountInput.value);
  if (!amt || amt <= 0) return alert("Enter a valid amount!");
  if (amt > balance) return alert("Insufficient balance!");
  balance -= amt;
  addHistory("Withdrawn", amt);
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (confirm("Reset everything?")) {
    balance = 0; history = [];
    saveData(); updateUI();
  }
});

document.getElementById("set-goal-btn").addEventListener("click", () => {
  const newGoal = parseFloat(document.getElementById("goal-input").value);
  if (!newGoal || newGoal <= 0) return alert("Enter valid goal!");
  goal = newGoal;
  saveData(); updateUI();
});

// ===== AUTHENTICATION =====
loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
    alert("Login failed!");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  location.reload();
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBtn.style.display = "none";
    userInfo.style.display = "flex";
    userName.textContent = user.displayName;
    userPhoto.src = user.photoURL || "https://via.placeholder.com/40";
    await loadUserData(user.uid);

    // Welcome animation
    welcomeBanner.textContent = `👋 Welcome back, ${user.displayName.split(" ")[0]}!`;
    welcomeBanner.style.opacity = "1";
    setTimeout(() => welcomeBanner.style.opacity = "0", 3000);

  } else {
    userInfo.style.display = "none";
    loginBtn.style.display = "flex";
    updateUI();
  }
});

// Initialize UI
updateUI();
