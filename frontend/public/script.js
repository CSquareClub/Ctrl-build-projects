const API_BASE = "http://localhost:3001";

async function generate(){

const prompt = document.getElementById("promptInput").value;

if(!prompt){
alert("Please enter a prompt");
return;
}

const output = document.getElementById("outputBody");
output.innerHTML = "Generating...";

try{

const res = await fetch(`${API_BASE}/api/generate`,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({prompt})
});

const data = await res.json();

output.innerHTML = data.text || "No response";

}catch(err){

output.innerHTML = "Error connecting to backend";

}

}