import { collection, getDocs, limit, query, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-app.js";

const state = { blogs: [], category: "All", query: "" };
const $ = (id) => document.getElementById(id);

function escapeText(value = "") { return String(value); }
function safeHtml(html = "") {
  if (window.DOMPurify) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["p","br","strong","em","u","s","h2","h3","h4","ul","ol","li","blockquote","a","img","hr"],
      ALLOWED_ATTR: ["href","target","rel","src","alt","loading"]
    });
  }
  // Fail closed if the sanitizer has not loaded.
  return "<p>Article content is temporarily unavailable.</p>";
}
function formatDate(value) {
  if (!value) return "";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function blogDate(blog) { return formatDate(blog.publishedAt || blog.date); }

function setStatus(message, type = "info") {
  const el = $("blogStatus");
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
  el.style.borderColor = type === "error" ? "#fecaca" : "#e2e8f0";
  el.style.background = type === "error" ? "#fef2f2" : "#fff";
  el.style.color = type === "error" ? "#991b1b" : "#475569";
}

function renderBlogs(data) {
  const grid = $("blogGrid");
  const noResults = $("noResults");
  if (!grid) return;
  grid.innerHTML = "";
  if (!data.length) { if (noResults) noResults.style.display = "block"; return; }
  if (noResults) noResults.style.display = "none";

  data.forEach((blog) => {
    const card = document.createElement("article");
    card.className = "blog-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    const image = document.createElement("img");
    image.src = blog.image || "cover.jpg";
    image.alt = escapeText(blog.title || "Blog cover");
    image.loading = "lazy";
    image.onerror = () => { image.src = "cover.jpg"; };
    const wrapper = document.createElement("div"); wrapper.className = "card-img-wrapper";
    const badge = document.createElement("span"); badge.className = "card-badge"; badge.textContent = blog.category || "Health";
    wrapper.append(image, badge);
    const content = document.createElement("div"); content.className = "card-content";
    const meta = document.createElement("div"); meta.className = "card-meta";
    meta.innerHTML = `<span><i class="far fa-calendar-alt"></i> ${escapeText(blogDate(blog))}</span><span><i class="far fa-clock"></i> ${escapeText(blog.readTime || "5 min read")}</span>`;
    const title = document.createElement("h3"); title.className = "card-title"; title.textContent = blog.title || "Untitled article";
    const excerpt = document.createElement("p"); excerpt.className = "card-excerpt"; excerpt.textContent = blog.excerpt || "";
    const footer = document.createElement("div"); footer.className = "card-footer"; footer.innerHTML = `<span>Read Article</span><i class="fas fa-arrow-right"></i>`;
    content.append(meta, title, excerpt, footer); card.append(wrapper, content);
    card.addEventListener("click", () => openModal(blog));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(blog); } });
    grid.appendChild(card);
  });
}

function applyFilters() {
  const q = state.query.toLowerCase();
  const filtered = state.blogs.filter((b) => {
    const categoryMatch = state.category === "All" || String(b.category || "").toLowerCase() === state.category.toLowerCase();
    const text = `${b.title || ""} ${b.excerpt || ""} ${b.category || ""}`.toLowerCase();
    return categoryMatch && text.includes(q);
  });
  renderBlogs(filtered);
}

function openModal(blog) {
  $("modalImg").src = blog.image || "cover.jpg";
  $("modalImg").alt = blog.title || "Blog cover";
  $("modalCategory").textContent = blog.category || "Health";
  $("modalTitle").textContent = blog.title || "Untitled article";
  $("modalDate").innerHTML = `<i class="far fa-calendar-alt"></i> ${escapeText(blogDate(blog))}`;
  $("modalReadTime").innerHTML = `<i class="far fa-clock"></i> ${escapeText(blog.readTime || "5 min read")}`;
  $("modalText").innerHTML = safeHtml(blog.content || "<p>No article content.</p>");
  const modal = $("articleModal"); modal.classList.add("active"); document.body.style.overflow = "hidden";
  document.title = `${blog.title || "Article"} | NutriLife AI`;
  const desc = document.querySelector('meta[name="description"]'); if (desc) desc.content = blog.seoDescription || blog.excerpt || desc.content;
  const url = new URL(window.location.href); url.searchParams.set("post", blog.slug || blog.id); history.replaceState({}, "", url);
}

async function loadBlogs() {
  setStatus("Loading latest articles…");
  try {
    const snap = await getDocs(query(collection(db, "blogs"), where("published", "==", true), limit(100)));
    state.blogs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    state.blogs.sort((a,b) => {
      const ad = a.publishedAt?.toMillis?.() || new Date(a.date || 0).getTime() || 0;
      const bd = b.publishedAt?.toMillis?.() || new Date(b.date || 0).getTime() || 0;
      return bd - ad;
    });
    $("blogStatus").style.display = "none";
    const categories = [...new Set(state.blogs.map(b => b.category).filter(Boolean))].sort();
    const categoryContainer = $("categoryContainer");
    if (categoryContainer) {
      categoryContainer.innerHTML = "";
      ["All", ...categories].forEach(category => {
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = `cat-btn ${category === "All" ? "active" : ""}`; btn.dataset.category = category; btn.textContent = category;
        btn.addEventListener("click", () => { state.category = category; document.querySelectorAll("[data-category]").forEach(b => b.classList.toggle("active", b === btn)); applyFilters(); });
        categoryContainer.appendChild(btn);
      });
    }
    applyFilters();
    const post = new URLSearchParams(location.search).get("post");
    if (post) { const found = state.blogs.find(b => (b.slug || b.id) === post); if (found) openModal(found); }
  } catch (error) {
    console.error(error);
    setStatus("We could not load the articles right now. Please refresh the page or try again later.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("searchInput")?.addEventListener("input", (e) => { state.query = e.target.value.trim(); applyFilters(); });
  document.querySelectorAll("[data-category]").forEach(btn => btn.addEventListener("click", () => {
    state.category = btn.dataset.category;
    document.querySelectorAll("[data-category]").forEach(b => b.classList.toggle("active", b === btn));
    applyFilters();
  }));
  $("modalCloseBtn")?.addEventListener("click", closeModal);
  loadBlogs();
});

function closeModal() {
  $("articleModal")?.classList.remove("active"); document.body.style.overflow = "auto";
  document.title = "NutriLife AI - Health Tips & Nutrition Blog";
  const desc = document.querySelector('meta[name="description"]'); if (desc) desc.content = "Science-backed health, nutrition, wellness, weight management, and lifestyle articles from NutriLife AI.";
  const url = new URL(window.location.href); url.searchParams.delete("post"); history.replaceState({}, "", url);
}
window.closeModal = closeModal;
