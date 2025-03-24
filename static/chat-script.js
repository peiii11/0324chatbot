// TaiSoc - 聊天頁面 JavaScript 文件

document.addEventListener('DOMContentLoaded', function() {
    console.log("聊天頁面已載入，初始化...");
    
    // 獲取DOM元素
    const messageInput = document.getElementById("message");
    const chatHistory = document.getElementById("chat-history");
    const welcomeSection = document.querySelector(".chat-welcome");
    const sendButton = document.getElementById("send-btn");
    const dotsButton = document.getElementById("dotsButton");
    const dotsMenu = document.getElementById("dotsMenu");
    
    /* ------------------------------
       1. 聊天功能
    ------------------------------ */
    async function sendMessage() {
        if (!messageInput || !chatHistory) return;
        
        const userMessage = messageInput.value.trim();
        if (userMessage === "") return;
        
        // 第一次送出訊息時，隱藏歡迎區塊
        if (welcomeSection) {
            welcomeSection.style.display = "none";
        }

        // 顯示使用者訊息（右側黑框）
        let userMessageEl = document.createElement("section");
        userMessageEl.classList.add("chat-container");
        userMessageEl.innerHTML = `
            <div class="user-message-container">
                <p class="user-message">${userMessage}</p>
            </div>
        `;
        chatHistory.appendChild(userMessageEl);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // 清空輸入欄位
        messageInput.value = "";

        // 呼叫後端 /chat API
        try {
            let response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage })
            });
            let result = await response.json();

            // 顯示 AI 回應
            let botMessageEl = document.createElement("section");
            botMessageEl.classList.add("chat-container");
            botMessageEl.innerHTML = `
                <div class="assistant-message-container">
                    <p class="assistant-message">${result.reply}</p>
                </div>
            `;
            chatHistory.appendChild(botMessageEl);
        } catch (error) {
            // 顯示錯誤訊息
            let errorEl = document.createElement("section");
            errorEl.classList.add("chat-container");
            errorEl.innerHTML = `
                <div class="assistant-message-container">
                    <p class="assistant-message">⚠️ 錯誤：${error}</p>
                </div>
            `;
            chatHistory.appendChild(errorEl);
        }

        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // 綁定發送訊息事件
    if (sendButton) {
        sendButton.addEventListener("click", sendMessage);
    }
    
    // 監聽 Enter 鍵
    if (messageInput) {
        messageInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();  // 防止預設行為
                sendMessage();
            }
        });
    }
    
    /* ------------------------------
       2. 三點選單功能
    ------------------------------ */
    if (dotsButton && dotsMenu) {
        dotsButton.addEventListener("click", (event) => {
            // 切換選單顯示或隱藏
            if (dotsMenu.style.display === "none" || dotsMenu.style.display === "") {
                dotsMenu.style.display = "block";
            } else {
                dotsMenu.style.display = "none";
            }
            // 阻止點擊事件冒泡，避免影響其他點擊處理
            event.stopPropagation();
        });

        // 當使用者點擊頁面其他地方時，自動隱藏選單
        document.addEventListener("click", (event) => {
            if (!dotsButton.contains(event.target) && !dotsMenu.contains(event.target)) {
                dotsMenu.style.display = "none";
            }
        });
    }
    
    /* ------------------------------
       3. New按鈕功能
    ------------------------------ */
    const newButton = document.querySelector(".new-button");
    if (newButton) {
        newButton.addEventListener("click", () => {
            // 清空聊天記錄
            if (chatHistory) {
                chatHistory.innerHTML = "";
            }
            
            // 顯示歡迎區塊
            if (welcomeSection) {
                welcomeSection.style.display = "flex";
            }
        });
    }
    
    // 側邊欄導航項目功能
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (event) => {
            event.preventDefault();
            const linkText = item.querySelector(".nav-label").textContent;
            
            if (linkText === "Home") {
                window.location.href = "/";
            } else if (linkText === "History") {
                // 暫時顯示提示訊息
                alert("查看歷史記錄功能即將推出");
            } else if (linkText === "Explore") {
                // 暫時顯示提示訊息
                alert("探索功能即將推出");
            }
        });
    });
    
    // 側邊選單項目功能
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            const menuText = item.querySelector(".menu-text").textContent;
            
            if (menuText === "Feedback") {
                alert("感謝您的使用！您可以發送電子郵件至 feedback@taisoc.com 提供意見反饋。");
            } else if (menuText === "Setting") {
                alert("設定功能即將推出");
            } else if (menuText === "About us") {
                alert("TaiSoc 是一個專注於臺灣社會文化交流的平台，致力於提供有關臺灣的知識和資訊。");
            }
            
            // 點擊後關閉選單
            if (dotsMenu) {
                dotsMenu.style.display = "none";
            }
        });
    });
});