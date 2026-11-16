const BASE = "https://issue-tracker-system-lue0.onrender.com/api";
let token = localStorage.getItem("issueToken") || "";
let currentUser = null, issues = [], users = [], authMode = "login";
const headers = () => ({ "Content-Type":"application/json", ...(token ? {Authorization:`Bearer ${token}`} : {}) });
async function api(path, options={}) {
  const r=await fetch(`${BASE}${path}`,{...options,headers:{...headers(),...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.message||"Request failed");
  return data;
}
function showAuth(mode) {
  authMode=mode; document.getElementById("authName").style.display=mode==="register"?"block":"none";
  document.getElementById("authName").required=mode==="register";
  document.getElementById("authSubmit").textContent=mode==="register"?"Create account":"Login";
  document.getElementById("loginTab").classList.toggle("selected",mode==="login");
  document.getElementById("registerTab").classList.toggle("selected",mode==="register");
  document.getElementById("authMessage").textContent="";
}
async function submitAuth(e) {
  e.preventDefault();
  try {
    const body={email:document.getElementById("authEmail").value.trim(),password:document.getElementById("authPassword").value};
    if(authMode==="register") body.name=document.getElementById("authName").value.trim();
    const data=await api(`/auth/${authMode}`,{method:"POST",body:JSON.stringify(body)});
    token=data.token; localStorage.setItem("issueToken",token); await startApp();
  } catch(err){document.getElementById("authMessage").textContent=err.message;}
}
function logout(){token="";currentUser=null;localStorage.removeItem("issueToken");document.getElementById("appScreen").style.display="none";document.getElementById("authScreen").style.display="flex";showAuth("login");}
async function startApp(){
  try{
    currentUser=await api("/auth/me");
    document.getElementById("authScreen").style.display="none";document.getElementById("appScreen").style.display="block";
    document.getElementById("signedIn").textContent=`${currentUser.name} (${currentUser.role})`;
    await loadUsers(); await loadIssues();
  }catch(e){logout();}
}
async function loadUsers(){
  users=await api("/users");
  const select=document.getElementById("assignedTo");
  select.innerHTML='<option value="">Unassigned</option>';
  users.forEach(u=>{const o=document.createElement("option");o.value=u._id;o.textContent=`${u.name} (${u.email})`;select.appendChild(o);});
}
async function loadIssues(){try{issues=await api("/issues");renderIssues();}catch(e){alert(e.message);}}
function openForm(){document.getElementById("issueForm").style.display="flex";}
function closeForm(){document.getElementById("issueForm").style.display="none";}
async function addIssue(){
  const title=document.getElementById("issueTitle").value.trim();
  if(!title)return alert("Please enter an issue title");
  try{await api("/issues",{method:"POST",body:JSON.stringify({title,description:document.getElementById("issueDescription").value,assigned:document.getElementById("assignedTo").value,priority:document.getElementById("priority").value})});
  document.getElementById("issueTitle").value="";document.getElementById("issueDescription").value="";closeForm();await loadIssues();}
  catch(e){alert(e.message);}
}
async function editIssue(id){
  const i=issues.find(x=>x._id===id);if(!i)return;
  const title=prompt("Edit issue title:",i.title);if(title===null||!title.trim())return;
  const description=prompt("Edit description:",i.description||"");if(description===null)return;
  try{await api(`/issues/${id}`,{method:"PUT",body:JSON.stringify({title:title.trim(),description})});await loadIssues();}catch(e){alert(e.message);}
}
async function updateStatus(id,status){try{await api(`/issues/${id}`,{method:"PUT",body:JSON.stringify({status})});await loadIssues();}catch(e){alert(e.message);}}
async function assignIssue(id,assigned){if(currentUser.role!=="admin")return;try{await api(`/issues/${id}`,{method:"PUT",body:JSON.stringify({assigned})});await loadIssues();}catch(e){alert(e.message);}}
async function deleteIssue(id){if(currentUser.role!=="admin")return alert("Only admin can delete issues");if(!confirm("Delete this issue?"))return;try{await api(`/issues/${id}`,{method:"DELETE"});await loadIssues();}catch(e){alert(e.message);}}
async function addComment(id){const comment=prompt("Enter your comment:");if(!comment||!comment.trim())return;try{await api(`/issues/${id}/comments`,{method:"POST",body:JSON.stringify({comment})});await loadIssues();}catch(e){alert(e.message);}}
function renderIssues(){
 const table=document.getElementById("issueTable");table.innerHTML="";
 issues.forEach(issue=>{
  const row=document.createElement("tr");
  const title=document.createElement("td");title.textContent=issue.title;row.appendChild(title);
  const assigned=document.createElement("td");
  if(currentUser.role==="admin"){
   const s=document.createElement("select");s.innerHTML='<option value="">Unassigned</option>';
   users.forEach(u=>{const o=document.createElement("option");o.value=u._id;o.textContent=u.name;o.selected=issue.assigned&&issue.assigned._id===u._id;s.appendChild(o);});
   s.onchange=()=>assignIssue(issue._id,s.value);assigned.appendChild(s);
  }else assigned.textContent=issue.assigned?.name||"Unassigned";
  row.appendChild(assigned);
  const priority=document.createElement("td");priority.textContent=issue.priority||"Medium";row.appendChild(priority);
  const status=document.createElement("td"),sel=document.createElement("select");
  ["Open","In Progress","Closed"].forEach(st=>{const o=document.createElement("option");o.value=st;o.textContent=st;o.selected=issue.status===st;sel.appendChild(o);});
  sel.onchange=()=>updateStatus(issue._id,sel.value);status.appendChild(sel);row.appendChild(status);
  const actions=document.createElement("td");
  const edit=document.createElement("button");edit.textContent="Edit";edit.onclick=()=>editIssue(issue._id);
  const comment=document.createElement("button");comment.textContent="Comment";comment.onclick=()=>addComment(issue._id);
  actions.append(edit,comment);
  if(currentUser.role==="admin"){const del=document.createElement("button");del.textContent="Delete";del.onclick=()=>deleteIssue(issue._id);actions.appendChild(del);}
  row.appendChild(actions);table.appendChild(row);
  const cr=document.createElement("tr"),cc=document.createElement("td");cc.colSpan=5;cc.className="comment-row";
  const h=document.createElement("strong");h.textContent="Comments";cc.appendChild(h);
  (issue.comments||[]).forEach(c=>{const d=document.createElement("div");d.className="comment-item";d.textContent="💬 "+c;cc.appendChild(d);});
  if(!(issue.comments||[]).length){const d=document.createElement("div");d.className="no-comment";d.textContent="No comments yet";cc.appendChild(d);}
  cr.appendChild(cc);table.appendChild(cr);
 });
 document.getElementById("totalCount").textContent=issues.length;
 document.getElementById("openCount").textContent=issues.filter(i=>i.status==="Open").length;
 document.getElementById("progressCount").textContent=issues.filter(i=>i.status==="In Progress").length;
 document.getElementById("closedCount").textContent=issues.filter(i=>i.status==="Closed").length;
}
showAuth("login");
if(token) startApp();
