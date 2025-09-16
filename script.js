
// ============================
// GLOBAL STATE & ELEMENT
// ============================
let connectedAccount = null;
let selectedFromToken = null;
let selectedToToken = null;
let routerContract = null;

const swapButton = document.getElementById("mainButton");
const connectBtn = document.getElementById("popupConnectBtn");
const walletAddressDisplay = document.getElementById("walletAddressDisplay");
swapButton.disabled = true;

// ============================
// TOKENS CONFIG
// ============================
const TOKENS = {
  ETH: { address: "0x02571ceFf12Ea1cc86F9B10beD9871464eda3316", symbol: "ETH", decimals: 18, icon: "ETH.png" },
  QIHV1: { address: "0x07fED9DD0CE61094f5C8eDA54a2dA8cDF7A4CE14", symbol: "QIHV1", decimals: 18, icon: "usdt.png" },
  QIH: { address: "0xDD176F0D9C66E6773fb1b041502F5E7aA3Ff7e5E", symbol: "QIH", decimals: 18, icon: "faqih.png" }
};

// ============================
// HELPER UI
// ============================
function shortenAddress(addr) { return addr.slice(0,6)+"..."+addr.slice(-4); }

function showToast(message, type="info", inModal=false) {
  let container = inModal ? document.getElementById("modalToastContainer") : document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = inModal ? "modal-toast" : "toast";
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(()=>toast.classList.add("show"),100);
  setTimeout(()=>{ toast.classList.remove("show"); setTimeout(()=>container.removeChild(toast),300); },3000);
}

// ============================
// UI CONNECT/DISCONNECT
// ============================
function updateUIConnected(address) {
  // Update hanya connect button
  connectBtn.innerText = shortenAddress(address);
  connectBtn.classList.add("connected");
  
  // Sembunyikan walletAddressDisplay
  walletAddressDisplay.style.display = "none";
  
  // Aktifkan tombol swap
  swapButton.disabled = false;
}

function updateUIDisconnected() {
  connectBtn.innerText = "Connect Wallet";
  connectBtn.classList.remove("connected");
  walletAddressDisplay.style.display = "none";
  walletAddressDisplay.textContent = "";
  swapButton.disabled = true;
  document.getElementById("fromInput").value = "";
  document.getElementById("toInput").value = "";
  document.getElementById("fromBalance").innerText = "Balance: 0.0000";
  document.getElementById("toBalance").innerText = "Balance: 0.0000";
  selectedFromToken = null;
  selectedToToken = null;
}

// ============================
// WALLET CONNECT / DISCONNECT
// ============================
const walletModal = document.getElementById("walletModal");
const closeBtn = document.querySelector(".wallet-option.cancel");

connectBtn.addEventListener("click", (e)=>{
  e.preventDefault();
  if(!connectedAccount){ walletModal.style.display="flex"; }
  else { disconnectWallet(); }
});

if(closeBtn) closeBtn.addEventListener("click", ()=>walletModal.style.display="none");

window.addEventListener("click",(e)=>{ if(e.target===walletModal) walletModal.style.display="none"; });

function disconnectWallet(){
  connectedAccount = null;
  routerContract = null;
  updateUIDisconnected();
}

// ============================
// WALLET CONNECT FUNCTIONS
// ============================
async function connectWalletAndUpdateUI(provider){
  const acc = await connectWallet(provider); // harus ada fungsi connectWallet
  if(acc){
    connectedAccount = acc;
    updateUIConnected(acc);
    await updateBalances();
    walletModal.style.display = "none";
  }
}
async function connectMetaMask(){ await connectWalletAndUpdateUI("metamask"); }
async function connectOKX(){ await connectWalletAndUpdateUI("okx"); }
async function connectBitget(){ await connectWalletAndUpdateUI("bitget"); }

// ============================
// FETCH BALANCE
// ============================
async function fetchBalance(token){
  if(!connectedAccount) return 0;
  try{
    if(token.symbol==="ETH"||token.symbol==="WETH"){
      let bal = await web3.eth.getBalance(connectedAccount);
      return parseFloat(web3.utils.fromWei(bal,"ether"));
    } else {
      const tokenContract = new web3.eth.Contract(ERC20_ABI,token.address);
      let rawBal = await tokenContract.methods.balanceOf(connectedAccount).call();
      if(!token.decimals) token.decimals = parseInt(await tokenContract.methods.decimals().call());
      return parseFloat(rawBal)/(10**token.decimals);
    }
  } catch(err){ console.error(err); return 0; }
}

async function updateBalances(){
  if(!connectedAccount) return;
  if(selectedFromToken){
    let bal = await fetchBalance(selectedFromToken);
    document.getElementById("fromBalance").innerText = `Balance: ${bal.toFixed(4)} ${selectedFromToken.symbol}`;
  }
  if(selectedToToken){
    let bal = await fetchBalance(selectedToToken);
    document.getElementById("toBalance").innerText = `Balance: ${bal.toFixed(4)} ${selectedToToken.symbol}`;
  }
}

// ============================
// SELECT TOKEN MODAL
// ============================
const selectTokenModal = document.getElementById("selectTokenModal");
const tokenSearchInput = document.getElementById("tokenSearchInput");
const customTokenList = document.getElementById("custom-token-list");
const defaultTokenListEl = document.getElementById("default-token-list");
let currentTokenSide = null;

const tokenList = Object.values(TOKENS);

function openTokenModal(side){ currentTokenSide=side; selectTokenModal.classList.add("active"); }
function toggleTokenModal(){ selectTokenModal.classList.remove("active"); tokenSearchInput.value=""; customTokenList.innerHTML=""; defaultTokenListEl.style.display="block"; }

function selectToken(symbol,icon,address){
  const otherSide = currentTokenSide==="from"?"to":"from";
  const otherName = document.getElementById(otherSide+"TokenName").textContent;
  if(symbol===otherName) return ("");

  const button = document.getElementById(currentTokenSide+"TokenButton");
  const nameEl = document.getElementById(currentTokenSide+"TokenName");
  button.querySelector("img").src = icon;
  nameEl.textContent = symbol;

  if(currentTokenSide==="from") selectedFromToken={symbol,icon,address};
  else selectedToToken={symbol,icon,address};

  toggleTokenModal();
  updateBalances();
}

tokenSearchInput.addEventListener("input",()=>{
  const value = tokenSearchInput.value.trim().toLowerCase();
  customTokenList.innerHTML="";
  defaultTokenListEl.style.display = value?"none":"block";
  const results = tokenList.filter(t=>t.symbol.toLowerCase().includes(value)||t.address.toLowerCase().includes(value));
  if(results.length===0){
    const div = document.createElement("div");
    div.className="token-label not-found";
    div.textContent="Token tidak ditemukan";
    customTokenList.appendChild(div);
    return;
  }
  results.forEach(token=>{
    const div = document.createElement("div");
    div.className="token-label";
    div.innerHTML=`<img src="${token.icon}" /><span>${token.symbol}</span>`;
    div.onclick = ()=>selectToken(token.symbol,token.icon,token.address);
    customTokenList.appendChild(div);
  });
});

// ============================
// SWAP ARROW (fallback default token)
// ============================
swapArrowBtn.addEventListener("click", async () => {
  // Pakai default kalau belum dipilih
  if(!selectedFromToken) selectedFromToken = TOKENS.ETH;
  if(!selectedToToken) selectedToToken = TOKENS.QIH;

  if(selectedFromToken.symbol === selectedToToken.symbol){}

  const fromBtn = document.getElementById("fromTokenButton");
  const toBtn = document.getElementById("toTokenButton");
  const fromName = document.getElementById("fromTokenName");
  const toName = document.getElementById("toTokenName");

  // Swap UI
  [fromBtn.querySelector("img").src, toBtn.querySelector("img").src] = [toBtn.querySelector("img").src, fromBtn.querySelector("img").src];
  [fromName.textContent, toName.textContent] = [toName.textContent, fromName.textContent];

  // Swap state
  [selectedFromToken, selectedToToken] = [selectedToToken, selectedFromToken];

  const fromInput = document.getElementById("fromInput");
  const toInput = document.getElementById("toInput");
  [fromInput.value, toInput.value] = [toInput.value, fromInput.value];

  await updateBalances();
  fromInput.dispatchEvent(new Event("input"));
});

// ============================
// SWAP BUTTON (fallback default token)
// ============================
swapButton.addEventListener("click", async () => {
  const amount = document.getElementById("fromInput").value;

  if(!amount || parseFloat(amount) <= 0){
    return showToast("Masukkan jumlah valid", "error");
  }

  // Fallback token kalau belum pilih
  const fromToken = selectedFromToken || TOKENS.ETH;
  const toToken = selectedToToken || TOKENS.QIH;

  try{
    await swapTokens(fromToken, toToken, amount); // swapTokens harus ada
    showToast("Swap berhasil!", "success");
    await updateBalances();
  } catch(err){
    console.error(err);
    showToast("Swap gagal!", "error");
  }
});

// ============================
// UPDATE BALANCE (fallback token)
// ============================
async function updateBalances() {
  if(!connectedAccount) return;

  const fromToken = selectedFromToken || TOKENS.ETH;
  const toToken = selectedToToken || TOKENS.QIH;

  const fromBal = await fetchBalance(fromToken);
  const toBal = await fetchBalance(toToken);

  document.getElementById("fromBalance").innerText = `Balance: ${fromBal.toFixed(4)} ${fromToken.symbol}`;
  document.getElementById("toBalance").innerText = `Balance: ${toBal.toFixed(4)} ${toToken.symbol}`;
}

// ============================  
// MAX BUTTON (fallback default token)  
// ============================  
const maxBtn = document.getElementById("maxButton");  
if(maxBtn){  
  maxBtn.addEventListener("click", async () => {  
    try {  
      // Fallback token default kalau belum pilih  
      const fromToken = selectedFromToken || TOKENS.ETH;

      let bal = await fetchBalance(fromToken);

      if(bal <= 0){  
        return  
      }

      document.getElementById("fromInput").value = bal.toFixed(4);

      // Update teks saldo
      await updateBalances();

      // Trigger estimasi otomatis
      document.getElementById("fromInput").dispatchEvent(new Event("input"));  

      showToast(`Menggunakan MAX dari ${fromToken.symbol}`, "info");  

    } catch(err){  
      console.error("Gagal ambil balance:", err);  
      showToast("❌ Gagal mengambil balance. Coba lagi.");  
    }  
  });  
}

// ============================
// AUTO ESTIMASI TO INPUT
// ============================
document.getElementById("fromInput").addEventListener("input",async()=>{
  if(!routerContract) return;
  const amount = document.getElementById("fromInput").value;
  if(!amount || parseFloat(amount)<=0){ document.getElementById("toInput").value=""; return; }

  const fromAddr = selectedFromToken?.address||"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const toAddr = selectedToToken?.address||TOKENS.QIH.address;
  try{
    const decimals = selectedFromToken?.decimals||18;
    const amountBN = web3.utils.toBN(amount*(10**decimals));
    const path = fromAddr==="0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"?[WETH_ADDRESS,toAddr]:[fromAddr,toAddr];
    const amountsOut = await routerContract.methods.getAmountsOut(amountBN,path).call();
    const rawOut = amountsOut[amountsOut.length-1];
    const toDecimals = selectedToToken?.decimals||18;
    document.getElementById("toInput").value=(rawOut/(10**toDecimals)).toFixed(6);
  } catch(err){ console.error(err); document.getElementById("toInput").value=""; }
});

// ============================
// SLIPPAGE
// ============================
const slippageButtons = document.querySelectorAll(".slippage-buttons button");
const slippageInput = document.querySelector(".slippage-input");
slippageButtons.forEach(btn=>btn.addEventListener("click",()=>{
  slippageButtons.forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  slippageInput.value=btn.textContent.replace("%","");
}));
slippageInput.addEventListener("input",()=>slippageButtons.forEach(b=>b.classList.remove("active")));

// ============================
// MENU POPUP
// ============================
const menuToggle=document.getElementById("menuToggle");
const menuPopup=document.getElementById("menuPopup");
menuToggle.addEventListener("click",()=>{
  menuPopup.classList.toggle("active");
  menuToggle.innerHTML=menuPopup.classList.contains("active")?"✖":"☰";
});

// ============================
// ABOUT POPUP + SLIDER
// ============================
const aboutPopup=document.getElementById("aboutPopup");
const openAbout=document.getElementById("openAbout");
const closeAbout=document.getElementById("closeAbout");
const aboutSlides=document.querySelectorAll(".about-slide");
const nextSlide=document.getElementById("nextSlide");
const prevSlide=document.getElementById("prevSlide");
let currentSlide=0;
openAbout.addEventListener("click",()=>aboutPopup.classList.add("active"));
closeAbout.addEventListener("click",()=>aboutPopup.classList.remove("active"));
function showSlide(index){ aboutSlides.forEach((s,i)=>s.classList.toggle("active",i===index)); }
nextSlide.addEventListener("click",()=>{ currentSlide=(currentSlide+1)%aboutSlides.length; showSlide(currentSlide); });
prevSlide.addEventListener("click",()=>{ currentSlide=(currentSlide-1+aboutSlides.length)%aboutSlides.length; showSlide(currentSlide); });

// ============================
// GAS SUMMARY TOGGLE
// ============================
const toggleGasDetails=document.getElementById("toggleGasDetails");
const gasDetails=document.getElementById("gasDetails");
const arrowIcon=document.getElementById("arrowIcon");
toggleGasDetails.addEventListener("click",()=>{
  gasDetails.classList.toggle("active");
  arrowIcon.textContent=gasDetails.classList.contains("active")?"▲":"▼";
});
// ============================
// TOAST UNTUK CONNECT WALLET
// ============================
function showWalletToast(message, type = "info") {
  const container = document.getElementById("modalToastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `modal-toast ${type}`; // info, success, error
  toast.innerText = message;
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => container.removeChild(toast), 300);
  }, 3000);
}

// ============================
// FUNGSI CONNECT WALLET
// ============================
async function connectWalletProvider(provider) {
  provider = provider.toLowerCase();
  if (provider === "metamask") {
    if (window.ethereum && window.ethereum.isMetaMask) return "MetaMask connected!";
    else return "MetaMask not detected!";
  }
  else if (provider === "okx") {
    if (window.okxwallet) return "OKX Wallet connected!";
    else return "OKX Wallet not detected!";
  }
  else if (provider === "bitget") {
    if (window.bitkeep && window.bitkeep.ethereum) return "Bitget Wallet connected!";
    else return "Bitget Wallet not detected!";
  }
  else return "Wallet not detected!";
}

// ============================
// EVENT UNTUK BUTTON
// ============================
document.querySelectorAll(".wallet-option").forEach(btn => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const walletName = btn.querySelector("span")?.innerText.toLowerCase() || "";
    const msg = await connectWalletProvider(walletName);
    showWalletToast(msg, msg.toLowerCase().includes("not detected") ? "error" : "success");
  });
});
function renderTokenList(tokens, container) {
  // Bersihkan dulu
  container.innerHTML = "";

  tokens.forEach(token => {
    const div = document.createElement("div");
    div.className = "token-label";
    div.innerHTML = `<img src="${token.icon}" /><span>${token.symbol}</span>`;
    div.onclick = () => selectToken(token.symbol, token.icon, token.address);
    container.appendChild(div);
  });
}

// Saat buka modal default
function openTokenModal(side) {
  currentTokenSide = side;
  selectTokenModal.classList.add("active");

  // Render default token list
  renderTokenList(tokenList, defaultTokenListEl);
  defaultTokenListEl.style.display = "block";
  customTokenList.innerHTML = "";
}

// Saat cari token (search)
tokenSearchInput.addEventListener("input", () => {
  const value = tokenSearchInput.value.trim().toLowerCase();
  customTokenList.innerHTML = "";
  defaultTokenListEl.style.display = value ? "none" : "block";

  if (value) {
    const results = tokenList.filter(t =>
      t.symbol.toLowerCase().includes(value) ||
      t.address.toLowerCase().includes(value)
    );

    if (results.length === 0) {
      const div = document.createElement("div");
      div.className = "token-label not-found";
      div.textContent = "Token tidak ditemukan";
      customTokenList.appendChild(div);
      return;
    }

    renderTokenList(results, customTokenList);
  }
});
// Popup elements
const popup = document.getElementById("network-popup");
const switchBtn = document.getElementById("switch-network");

// Event tombol switch jaringan
switchBtn.addEventListener("click", async () => {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }]
    });
    popup.classList.add("hidden");
  } catch (err) {
    if (err.code === 4902) {
      // Kalau chain belum ada di MetaMask → tambahkan
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [targetChainData]
      });
    } else {
      console.error("Switch error:", err);
    }
  }
});
const inputs = document.querySelectorAll('input');

  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      document.body.classList.add('noscroll');
    });
    input.addEventListener('blur', () => {
      document.body.classList.remove('noscroll');
    });
  });