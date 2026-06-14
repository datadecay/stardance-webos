export function popup(message, title = "Alert", options = {}, width = null, height = null) {
    const popupEl = document.createElement("div");
    popupEl.className = "window";
    
    popupEl.style.zIndex = "10001";
    popupEl.style.position = "fixed";
    popupEl.style.width = width || "350px";
    popupEl.style.height = height || "180px";

    const handleEl = document.createElement("div");
    handleEl.className = "handle";

    const titleEl = document.createElement("span");
    titleEl.textContent = title;
    titleEl.style.fontWeight = "bold";

    const closeBtn = document.createElement("button");
    closeBtn.className = "content-button";
    closeBtn.addEventListener("click", () => popupEl.remove());

    handleEl.appendChild(titleEl);
    handleEl.appendChild(closeBtn);
    popupEl.appendChild(handleEl);

    const windowContentEl = document.createElement("div");
    windowContentEl.className = "window-content";
    windowContentEl.style.flexDirection = "column"; 

    const contentEl = document.createElement("div");
    contentEl.className = "main-content";
    contentEl.style.display = "flex";
    contentEl.style.alignItems = "center";
    contentEl.style.justifyContent = "center";
    contentEl.style.textAlign = "center";
    contentEl.style.flex = "1";
    contentEl.textContent = message;
    windowContentEl.appendChild(contentEl);

    const hasOptions = Object.keys(options).length > 0;
    if (hasOptions) {
        const actionRow = document.createElement("div");
        actionRow.style.display = "flex";
        actionRow.style.justifyContent = "center";
        actionRow.style.gap = "10px";
        actionRow.style.padding = "10px";
        actionRow.style.background = "var(--bg-surface)";
        actionRow.style.borderTop = "1px solid var(--primary)";

        for (const key in options) {
            const btnConfig = options[key];
            const btn = document.createElement("button");
            
            btn.textContent = btnConfig.text || key;
            
            btn.style.padding = "6px 16px";
            btn.style.cursor = "pointer";
            btn.style.border = "1px solid var(--primary)";
            btn.style.backgroundColor = "var(--secondary)";
            btn.style.color = "var(--text-secondary)";

            btn.addEventListener("click", () => {
                if (typeof btnConfig === "function") {
                    btnConfig();
                } else if (btnConfig && typeof btnConfig.callback === "function") {
                    btnConfig.callback();
                }
                popupEl.remove();
            });
            actionRow.appendChild(btn);
        }
        windowContentEl.appendChild(actionRow);

    }

    popupEl.appendChild(windowContentEl);
    document.body.appendChild(popupEl);
    window.dragElement(popupEl);
}