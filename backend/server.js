const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" }
}, { timestamps: true });
const User = mongoose.model("User", userSchema);

const issueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assigned: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  status: { type: String, enum: ["Open", "In Progress", "Closed"], default: "Open" },
  comments: [{ type: String }]
}, { timestamps: true });
const Issue = mongoose.model("Issue", issueSchema);

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Please log in" });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: "Session expired. Please log in again." }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}
const tokenFor = user => jwt.sign(
  { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
  process.env.JWT_SECRET, { expiresIn: "12h" }
);

app.get("/", (req, res) => res.send("Issue Tracker Backend is Running!"));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ message: "Name, email and password (minimum 6 characters) are required" });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email is already registered" });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: "user" });
    res.status(201).json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = (req.body.email || "").toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(401).json({ message: "Invalid email or password" });
    res.json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("_id name email role");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

app.get("/api/users", auth, async (req, res) => {
  const users = await User.find().select("_id name email role").sort({ name: 1 });
  res.json(users);
});

app.get("/api/issues", auth, async (req, res) => {
  try { res.json(await Issue.find().populate("assigned", "name email").sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
app.post("/api/issues", auth, async (req, res) => {
  try {
    const issue = await Issue.create({
      title: req.body.title, description: req.body.description,
      assigned: req.body.assigned || null, priority: req.body.priority || "Medium"
    });
    res.status(201).json(await issue.populate("assigned", "name email"));
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.put("/api/issues/:id", auth, async (req, res) => {
  try {
    const allowed = {};
    ["title", "description", "status", "priority"].forEach(k => { if (req.body[k] !== undefined) allowed[k] = req.body[k]; });
    if (req.user.role === "admin" && req.body.assigned !== undefined) allowed.assigned = req.body.assigned || null;
    const issue = await Issue.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true }).populate("assigned", "name email");
    if (!issue) return res.status(404).json({ message: "Issue not found" });
    res.json(issue);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete("/api/issues/:id", auth, adminOnly, async (req, res) => {
  try {
    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });
    res.json({ message: "Issue deleted successfully" });
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.post("/api/issues/:id/comments", auth, async (req, res) => {
  try {
    const comment = (req.body.comment || "").trim();
    if (!comment) return res.status(400).json({ message: "Comment cannot be empty" });
    const issue = await Issue.findByIdAndUpdate(req.params.id, { $push: { comments: `${req.user.name}: ${comment}` } }, { new: true }).populate("assigned", "name email");
    if (!issue) return res.status(404).json({ message: "Issue not found" });
    res.json(issue);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("MongoDB Connected Successfully!");
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.toLowerCase();
    const exists = await User.findOne({ email });
    if (!exists) {
      const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await User.create({ name: process.env.ADMIN_NAME || "Administrator", email, password, role: "admin" });
      console.log("Initial admin account created from environment settings.");
    }
  }
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(e => console.error("MongoDB Error:", e.message));
