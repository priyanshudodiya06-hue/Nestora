let products=[
 {id:1,name:"Cloud Comfort Sofa",category:"Furniture",price:1299,deposit:2500,img:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",rating:"4.9",desc:"A deep, three-seater sofa with stain-resistant upholstery and soft, supportive cushions."},
 {id:2,name:"Nordic Queen Bed",category:"Furniture",price:999,deposit:2000,img:"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",rating:"4.8",desc:"Minimal solid-wood queen bed with an orthopedic mattress option."},
 {id:3,name:"Focus Work Desk",category:"Furniture",price:449,deposit:800,img:"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80",rating:"4.7",desc:"Compact work desk with cable management and two storage drawers."},
 {id:4,name:"FrostFree Refrigerator",category:"Appliances",price:1099,deposit:2200,img:"https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80",rating:"4.9",desc:"Energy-efficient 260L double-door refrigerator, ideal for shared homes."},
 {id:5,name:"Smart Wash 7kg",category:"Appliances",price:849,deposit:1700,img:"https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80",rating:"4.8",desc:"Fully automatic front-load washing machine with quick wash mode."},
 {id:6,name:"Cinema 43” Smart TV",category:"Appliances",price:799,deposit:1600,img:"https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=900&q=80",rating:"4.6",desc:"Crisp 4K streaming TV with popular entertainment apps built in."}
];
const money=n=>"₹"+Number(n).toLocaleString("en-IN");
// Normalize backend product fields into the UI model used across pages
const apiProduct = p => ({
  // Backend uses publicId; keep UI id consistent
  id: Number(p.publicId ?? p.id),
  name: p.name,
  category: p.category,
  price: Number(p.monthlyRent ?? p.price),
  deposit: Number(p.securityDeposit ?? p.deposit),
  img: p.image ?? p.img ?? p.imageUrl,
  rating: p.rating ?? "4.7",
  desc: p.description ?? p.desc,
  // Backend may expose tenure options; UI expects an array
  tenures: p.tenureOptions ?? p.tenures ?? [3, 6, 12]
});
const getCart=()=>JSON.parse(localStorage.getItem("nestoraCart")||"[]");
const setCart=c=>{localStorage.setItem("nestoraCart",JSON.stringify(c));updateCount()};
function addToCart(id,tenure=6){let c=getCart(),x=c.find(i=>i.id===id&&i.tenure===tenure);x?x.qty++:c.push({id,qty:1,tenure});setCart(c);toast(`Added with a ${tenure}-month plan`);}
function updateCount(){document.querySelectorAll(".cart-count").forEach(el=>el.textContent=getCart().reduce((a,b)=>a+b.qty,0))}
function toast(text){let t=document.createElement("div");t.textContent=text;t.style.cssText="position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#17211b;color:white;padding:12px 20px;border-radius:12px;z-index:99;box-shadow:0 10px 30px #0003";document.body.append(t);setTimeout(()=>t.remove(),2200)}
function productCard(p){return `<article class="product-card" data-category="${p.category}"><button class="heart">♡</button><a href="product.html?id=${p.id}"><div class="product-img"><img src="${p.img}" alt="${p.name}"></div></a><div class="product-info"><span class="chip">${p.category}</span><a href="product.html?id=${p.id}"><h3>${p.name}</h3></a><div class="plan-note">3 · 6 · 12 month plans</div><div class="product-meta"><div><div class="price">${money(p.price)} <small>/ month</small></div><div class="rating">★ ${p.rating} · Free setup</div></div><button class="add-btn" onclick="addToCart(${p.id})">＋</button></div></div></article>`}
function renderProducts(list=products){
  let el=document.querySelector("#productGrid");
  if(!el) return;
  el.innerHTML=(list||[]).map(productCard).join("");
}

function renderDetail(){
  let el=document.querySelector("#productDetail");
  if(!el) return;

  let id=Number(new URLSearchParams(location.search).get("id"));
  if(!Number.isFinite(id)) id=(products?.[0]?.id ?? 1);

  let p=products.find(x=>x.id===id) || products?.[0];
  if(!p) return;

  let tenures=Array.isArray(p.tenures) && p.tenures.length ? p.tenures : [3,6,12];

  el.innerHTML=`<img class="detail-img" src="${p.img || ''}" alt="${p.name}"><div class="detail-copy"><span class="chip">${p.category}</span><h1>${p.name}</h1><div>★ ${p.rating} &nbsp; <span class="muted">48 reviews · In stock</span></div><div class="detail-price">${money(p.price)} <small class="muted">/ month</small></div><p class="muted">${p.desc || ''}</p><span class="option-label">Choose your monthly rental plan</span><div class="option-row">${tenures.map(t=>`<button class="option ${t===6?"selected":""}" data-tenure="${t}" onclick="selectTenure(this)"><b>${t}</b> months${t===12?" · Best value":""}</button>`).join("")}</div><p class="muted plan-help">Your monthly rent stays fixed for the selected tenure.</p><div class="deposit">🔒 Refundable security deposit: <b>${money(p.deposit)}</b></div><div class="feature-list"><div class="feature">✓ Free delivery</div><div class="feature">✓ Free installation</div><div class="feature">✓ Maintenance included</div><div class="feature">✓ Easy relocation</div></div><button id="detailAdd" class="btn btn-block" onclick="addSelectedPlan(${p.id})">Add 6-month plan · ${money(p.price)}/mo</button></div>`
}

function selectTenure(button){document.querySelectorAll(".option[data-tenure]").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");let tenure=Number(button.dataset.tenure),id=Number(new URLSearchParams(location.search).get("id"))||1,p=products.find(item=>item.id===id);document.querySelector("#detailAdd").textContent=`Add ${tenure}-month plan · ${money(p.price)}/mo`}
function addSelectedPlan(id){let tenure=Number(document.querySelector(".option.selected")?.dataset.tenure)||6;addToCart(id,tenure);location.href="cart.html"}
function renderCart(){let el=document.querySelector("#cartItems");if(!el)return;let c=getCart();if(!c.length){el.innerHTML=`<div style="text-align:center;padding:45px"><h3>Your cart feels a little empty</h3><p class="muted">Pick something that makes your place feel like home.</p><a class="btn" href="explore.html">Explore products</a></div>`}else el.innerHTML=c.map((i,index)=>{let p=products.find(x=>x.id===i.id);return `<div class="cart-item"><img src="${p.img}" alt=""><div><h3>${p.name}</h3><label class="cart-plan">Rental plan <select onchange="changeTenure(${index},this.value)"><option value="3" ${i.tenure===3?"selected":""}>3 months</option><option value="6" ${i.tenure===6?"selected":""}>6 months</option><option value="12" ${i.tenure===12?"selected":""}>12 months</option></select></label><span class="muted"> · ${money(p.deposit)} deposit</span><div class="qty"><button onclick="changeQty(${index},-1)">−</button><b>${i.qty}</b><button onclick="changeQty(${index},1)">+</button><button style="width:auto;padding:0 8px" onclick="removeItem(${index})">Remove</button></div></div><div><b>${money(p.price*i.qty)}/mo</b></div></div>`}).join("");renderSummary()}
function changeTenure(index,tenure){let c=getCart();c[index].tenure=Number(tenure);setCart(c);renderCart()}
function changeQty(index,n){let c=getCart();c[index].qty+=n;if(c[index].qty<1)c.splice(index,1);setCart(c);renderCart()}
function removeItem(index){let c=getCart();c.splice(index,1);setCart(c);renderCart()}
function renderSummary(){let subtotal=getCart().reduce((s,i)=>s+(products.find(p=>p.id===i.id)?.price||0)*i.qty,0),deposit=getCart().reduce((s,i)=>s+(products.find(p=>p.id===i.id)?.deposit||0)*i.qty,0);document.querySelectorAll("[data-subtotal]").forEach(e=>e.textContent=money(subtotal));document.querySelectorAll("[data-deposit]").forEach(e=>e.textContent=money(deposit));document.querySelectorAll("[data-total]").forEach(e=>e.textContent=money(subtotal+deposit))}
async function loadProducts(){try{let response=await fetch("/api/products");if(!response.ok)throw new Error();let data=await response.json();if(data.length)products=data.map(apiProduct)}catch{}renderProducts();renderDetail();renderCart();renderSummary()}
async function submitCheckout(form){let cart=getCart();if(!cart.length)return toast("Your cart is empty");let fields=new FormData(form),payload={customerName:fields.get("customerName"),phone:fields.get("phone"),items:cart.map(item=>({productId:item.id,quantity:item.qty,tenure:item.tenure})),delivery:{address:fields.get("address"),city:fields.get("city"),pinCode:fields.get("pinCode"),date:fields.get("deliveryDate"),timeSlot:fields.get("timeSlot")}};try{let response=await fetch("/api/rentals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!response.ok)throw new Error((await response.json()).error);let order=await response.json();sessionStorage.setItem("lastOrder",JSON.stringify(order));localStorage.removeItem("nestoraCart");location.href="success.html"}catch(error){toast(error.message||"Could not place order. Please try again.")}}
async function loadKpis(){if(!document.querySelector("[data-kpi]"))return;try{let response=await fetch("/api/admin/kpis");if(!response.ok)return;let data=await response.json();let values={active:data.activeRentals,mrr:money(data.mrr),utilization:data.utilizationRate+"%",retention:data.retentionRate+"%",maintenance:data.averageMaintenanceResolutionHours+"h"};document.querySelectorAll("[data-kpi]").forEach(el=>{if(values[el.dataset.kpi]!==undefined)el.textContent=values[el.dataset.kpi]})}catch{}}
async function submitAuth(form){
  const email=form.querySelector('input[type="email"]')?.value;
  const password=form.querySelector('input[type="password"]')?.value;
  const signingUp=location.pathname.endsWith("signup.html");
  const textInputs=[...form.querySelectorAll('input:not([type="email"]):not([type="password"]):not([type="checkbox"])')];
  const payload=signingUp
    ? {name:textInputs.map(input=>input.value.trim()).filter(Boolean).join(" "),email,password}
    : {email,password};
  try{
    const response=await fetch(signingUp?"/api/users":"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error);
    localStorage.setItem("nestoraUser",JSON.stringify(data));
    location.href="explore.html";
  }catch(error){toast(error.message||"Could not sign in")}
}
document.addEventListener("DOMContentLoaded",()=>{
  updateCount();
  loadProducts();
  loadKpis();

  const menuBtn=document.querySelector(".menu-btn");
  const navLinks=document.querySelector(".nav-links");
  if(menuBtn && navLinks){
    menuBtn.addEventListener("click",()=>{
      const isOpen=navLinks.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
    });
    navLinks.addEventListener("click",e=>{
      const target=e.target;
      if(target && target.tagName === "A"){
        navLinks.classList.remove("open");
        menuBtn.setAttribute("aria-expanded","false");
      }
    });
  }

  document.querySelectorAll(".filter").forEach(f=>f.onclick=()=>{
    document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));
    f.classList.add("active");
    renderProducts(f.dataset.filter==="All"?products:products.filter(p=>p.category===f.dataset.filter));
  });

  document.querySelector("#search")?.addEventListener("input",e=>{
    const q=(e.target.value||"").toLowerCase();
    renderProducts(products.filter(p=>String(p.name||"").toLowerCase().includes(q)));
  });

  document.querySelector("#checkoutForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    submitCheckout(e.currentTarget);
  });

  document.querySelectorAll(".auth-submit").forEach(b=>b.closest("form").onsubmit=e=>{
    e.preventDefault();
    submitAuth(e.currentTarget);
  });
});
