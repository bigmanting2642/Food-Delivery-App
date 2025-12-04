// src/App.js

import React, { useState, useEffect } from "react";
import "./App.css";
import {
  bubbleSortByName,
  bubbleSortPriceAsc,
  bubbleSortPriceDesc,
  binarySearchByName,
} from "./utils/dsa.js";

const API_BASE = "http://localhost:5000/api";

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isShopkeeper, setIsShopkeeper] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    price: "",
    image: "",
    description: "",
    imageFile: null,
  });
  const [pendingOrders, setPendingOrders] = useState([]);

  // Helper to call API with auth (if token available)
  const fetchWithAuth = (url, opts = {}) => {
    const headers = opts.headers || {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...headers },
    });
  };

  // === INITIAL DATA LOAD ===
  useEffect(() => {
    loadMenu();
    loadMessages();
    loadNotifications();
    loadPendingOrders();

    const savedUser = localStorage.getItem("fd_currentUser");
    const savedToken = localStorage.getItem("fd_token");
    const savedRole = localStorage.getItem("fd_role");

    if (savedUser) {
      setCurrentUser(savedUser);
      setToken(savedToken);
      setIsShopkeeper(savedRole === "shopkeeper");
    }
    // eslint-disable-next-line
  }, []);

  // Load menu from backend
  const loadMenu = async () => {
    try {
      const res = await fetch(`${API_BASE}/menu`);
      if (!res.ok) throw new Error("Menu load failed");

      const data = await res.json();

      const mapped = data.map((item) => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        description: item.description,
        imageFile: null,
        image: "🍽️",
      }));

      setMenuItems(mapped);
    } catch (err) {
      console.warn("Failed to load menu from backend:", err);
    }
  };

  // Load messages from backend – map DB shape → UI shape
  const loadMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages`);
      if (!res.ok) throw new Error("Messages load failed");
      const data = await res.json();

      const mapped = data.map((m) => ({
        user: m.from_user,
        text: m.text,
        timestamp: m.created_at
          ? new Date(m.created_at).toLocaleTimeString()
          : "",
        isShopkeeper: m.to_user === "customer",
      }));

      setMessages(mapped);
    } catch (err) {
      console.warn("Messages load failed", err);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (!res.ok) throw new Error("Notifications load failed");
      const data = await res.json();
      setNotifications(data.map((n) => n.message));
    } catch (err) {
      console.warn("Notifications load failed", err);
    }
  };

  // Load pending orders (shopkeeper)
  const loadPendingOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      if (!res.ok) throw new Error("Orders load failed");
      const data = await res.json();

      const uxOrders = await Promise.all(
        data.map(async (o) => {
          const itemsRes = await fetch(
            `${API_BASE}/orders/${o.id}/items`
          ).catch(() => null);
          let items = [];
          if (itemsRes && itemsRes.ok) items = await itemsRes.json();

          return {
            id: o.id,
            customer: o.customer_id || "customer",
            items: items.length ? items : [],
            total: o.total || 0,
            timestamp: o.created_at || new Date().toLocaleTimeString(),
            status: o.status || "pending",
          };
        })
      );

      setPendingOrders(uxOrders);
    } catch (err) {
      console.warn("Pending orders load failed", err);
    }
  };

  // === AUTH: Login (calls backend) ===
  const handleLogin = async (username, password, roleChoice) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data && data.token) {
        setCurrentUser(username);
        setToken(data.token);
        setIsShopkeeper(
          data.role === "shopkeeper" || roleChoice === "shopkeeper"
        );

        localStorage.setItem("fd_currentUser", username);
        localStorage.setItem("fd_token", data.token);
        localStorage.setItem("fd_role", data.role || (roleChoice || "customer"));

        setNotifications((prev) => [...prev, `🎉 Welcome ${username}!`]);

        loadMenu();
        loadMessages();
        loadPendingOrders();
        return;
      }
    } catch (err) {
      console.warn("Backend login failed — using demo fallback.", err);
    }

    const demoUsers = [
      { username: "user1", password: "pass1", type: "customer" },
      { username: "shop1", password: "shop1", type: "shopkeeper" },
    ];
    const user = demoUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      setCurrentUser(username);
      setIsShopkeeper(user.type === "shopkeeper");
      setNotifications((prev) => [
        ...prev,
        `🎉 Welcome ${username}! (demo)`,
      ]);
      localStorage.setItem("fd_currentUser", username);
      localStorage.setItem("fd_role", user.type);
    } else {
      alert("Invalid credentials!");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsShopkeeper(false);
    setCart([]);
    setToken(null);
    localStorage.removeItem("fd_currentUser");
    localStorage.removeItem("fd_token");
    localStorage.removeItem("fd_role");
  };

  // === CART OPERATIONS (UI-level) ===
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const getTotal = () => {
    return cart
      .reduce(
        (total, item) =>
          total + parseFloat(item.price || 0) * item.quantity,
        0
      )
      .toFixed(2);
  };

  // === MESSAGES ===
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageObj = {
      user: currentUser || "Guest",
      text: newMessage,
      timestamp: new Date().toLocaleTimeString(),
      isShopkeeper,
    };

    // Optimistic UI
    setMessages((prev) => [...prev, messageObj]);
    setNewMessage("");

    try {
      await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_user: currentUser || "Guest",
          to_user: isShopkeeper ? "customer" : "shopkeeper",
          text: messageObj.text,
        }),
      });

      loadMessages();
    } catch (err) {
      console.warn("Failed to send message to backend", err);
    }
  };

  // === MENU MANAGEMENT (Shopkeeper) ===
  const addMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      alert("Name and price are required");
      return;
    }

    const tempId = Date.now();
    const uiItem = {
      id: tempId,
      name: newMenuItem.name,
      price: parseFloat(newMenuItem.price),
      description: newMenuItem.description,
      imageFile: newMenuItem.imageFile,
      image: newMenuItem.imageFile ? "📷" : "🍽️",
    };

    setMenuItems((prev) => [...prev, uiItem]);
    setNewMenuItem({
      name: "",
      price: "",
      image: "",
      description: "",
      imageFile: null,
    });

    try {
      const res = await fetchWithAuth(`${API_BASE}/menu`, {
        method: "POST",
        body: JSON.stringify({
          name: uiItem.name,
          price: uiItem.price,
          description: uiItem.description,
        }),
      });

      if (!res.ok) throw new Error("Backend add failed");

      const saved = await res.json();

      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...saved,
                price: parseFloat(saved.price),
                image: uiItem.image,
                imageFile: uiItem.imageFile,
              }
            : item
        )
      );
    } catch (err) {
      console.warn("Add menu API failed", err);
    }
  };

  const removeMenuItem = async (id) => {
    try {
      setMenuItems((prev) => prev.filter((item) => item.id !== id));

      await fetch(`${API_BASE}/menu/${id}`, {
        method: "DELETE",
      });

      setNotifications((prev) => [...prev, "🗑️ Menu item removed"]);
    } catch (err) {
      console.warn("Delete menu item failed", err);
    }
  };

  // handle image upload (same as before)
  const handleImageUpload = (e, setImageState) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageState((prev) => ({
          ...prev,
          image: "📷",
          imageFile: ev.target.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // === ORDERS / CHECKOUT ===
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("🛒 Your cart is empty!");
      return;
    }

    const itemsForBackend = cart.map((i) => ({
      menu_item_id: i.id,
      quantity: i.quantity,
      price: i.price,
    }));

    const orderUI = {
      id: Date.now(),
      customer: currentUser || "guest",
      items: [...cart],
      total: getTotal(),
      timestamp: new Date().toLocaleTimeString(),
      status: "pending",
    };

    setPendingOrders((prev) => [...prev, orderUI]);
    setCart([]);
    setNotifications((prev) => [
      ...prev,
      `🎉 Order #${orderUI.id} placed successfully! Total: $${orderUI.total}`,
    ]);

    try {
      const res = await fetchWithAuth(`${API_BASE}/orders`, {
        method: "POST",
        body: JSON.stringify({
          customer_id: null,
          total: parseFloat(orderUI.total),
          items: itemsForBackend,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order_id) {
          setPendingOrders((prev) =>
            prev.map((o) =>
              o.id === orderUI.id ? { ...o, id: data.order_id } : o
            )
          );
          setNotifications((prev) => [
            ...prev,
            `🆕 New order from ${orderUI.customer}! Total: $${orderUI.total}`,
          ]);
        }
      }
    } catch (err) {
      console.warn("Order API failed", err);
    }

    alert(
      `🎉 Order placed successfully!
Order #${orderUI.id}
Total: $${orderUI.total}
Your order will be ready for pickup soon! 📍`
    );
  };

  const markOrderReady = async (orderId) => {
    setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
    setNotifications((prev) => [
      ...prev,
      `✅ Order #${orderId} marked as ready for pickup!`,
    ]);
    try {
      await fetchWithAuth(`${API_BASE}/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ready" }),
      });
    } catch (err) {
      console.warn("Mark ready API failed", err);
    }
  };

  const handleLoginWrapper = (username, password) => {
    handleLogin(username, password);
  };

  // If not logged in -> LoginPage
  if (!currentUser) {
    return <LoginPage onLogin={handleLoginWrapper} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>🍕 Foodie Delight</h1>
          <div className="header-actions">
            {!isShopkeeper && (
              <div className="cart-icon">
                🛒 {cart.reduce((total, item) => total + item.quantity, 0)}
              </div>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              Logout ({currentUser})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {isShopkeeper ? (
          <ShopkeeperInterface
            menuItems={menuItems}
            onAddMenuItem={addMenuItem}
            onRemoveMenuItem={removeMenuItem}
            newMenuItem={newMenuItem}
            setNewMenuItem={setNewMenuItem}
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={sendMessage}
            notifications={notifications}
            pendingOrders={pendingOrders}
            onMarkOrderReady={markOrderReady}
            onImageUpload={handleImageUpload}
          />
        ) : (
          <CustomerInterface
            menuItems={menuItems}
            cart={cart}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onUpdateQuantity={updateQuantity}
            total={getTotal()}
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={sendMessage}
            onCheckout={handleCheckout}
          />
        )}
      </div>
    </div>
  );
};

// ---------- Login Component ----------
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isShopkeeper, setIsShopkeeper] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password, isShopkeeper ? "shopkeeper" : "customer");
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h2>🍽️ Welcome to Foodie Delight</h2>
          <p>Good food, good mood! 🎉</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="user-type-toggle">
            <button
              type="button"
              className={!isShopkeeper ? "active" : ""}
              onClick={() => setIsShopkeeper(false)}
            >
              Customer
            </button>
            <button
              type="button"
              className={isShopkeeper ? "active" : ""}
              onClick={() => setIsShopkeeper(true)}
            >
              Shopkeeper
            </button>
          </div>

          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <div className="demo-accounts">
            <p>
              <strong>Demo Accounts:</strong>
            </p>
            <p>Customer: user1 / pass1</p>
            <p>Shopkeeper: shop1 / shop1</p>
          </div>

          <button type="submit" className="login-btn">
            {isShopkeeper ? "Login as Shopkeeper" : "Login as Customer"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ---------- CustomerInterface ----------
const CustomerInterface = ({
  menuItems,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onUpdateQuantity,
  total,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  onCheckout,
}) => {
  const [activeTab, setActiveTab] = useState("menu");

  const [displayItems, setDisplayItems] = useState(menuItems);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [sortOption, setSortOption] = useState("");

  useEffect(() => {
    setDisplayItems(menuItems);
  }, [menuItems]);

  // DSA Search
  const handleSearch = () => {
    const sorted = bubbleSortByName([...displayItems], true);
    const result = binarySearchByName(sorted, searchTerm);

    setDisplayItems(sorted);
    setSearchResult(result || { name: "Not found" });
  };

  // DSA Sorting
  const handleSort = (option) => {
    setSortOption(option);
    let sorted = [...displayItems];

    switch (option) {
      case "az":
        sorted = bubbleSortByName(sorted, true);
        break;
      case "za":
        sorted = bubbleSortByName(sorted, false);
        break;
      case "priceLow":
        sorted = bubbleSortPriceAsc(sorted);
        break;
      case "priceHigh":
        sorted = bubbleSortPriceDesc(sorted);
        break;
      default:
        return;
    }

    setDisplayItems(sorted);
  };

  return (
    <div className="customer-interface">
      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={activeTab === "menu" ? "active" : ""}
          onClick={() => setActiveTab("menu")}
        >
          🍕 Menu
        </button>

        <button
          className={activeTab === "cart" ? "active" : ""}
          onClick={() => setActiveTab("cart")}
        >
          🛒 Cart ({cart.reduce((total, item) => total + item.quantity, 0)})
        </button>

        <button
          className={activeTab === "messages" ? "active" : ""}
          onClick={() => setActiveTab("messages")}
        >
          💬 Messages
        </button>
      </div>

      {/* MENU TAB */}
      {activeTab === "menu" && (
        <div className="menu-section">
          <h2>Explore Our Menu 🍽️</h2>

          {/* Search + Sort Controls */}
          <div className="search-sort-bar">
            <input
              type="text"
              placeholder="Search food by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <button onClick={handleSearch}>🔍 Search</button>

            <select
              value={sortOption}
              onChange={(e) => handleSort(e.target.value)}
            >
              <option value="">Sort By</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
            </select>
          </div>

          {/* Display Search Result */}
          {searchResult && (
            <div className="search-result">
              <p>
                🔎 Search result for <strong>{searchTerm}</strong>:{" "}
                {searchResult.name || "Not found"}
              </p>
            </div>
          )}

          {/* Menu Grid */}
          <div className="menu-grid">
            {displayItems.map((item) => (
              <div key={item.id} className="menu-item">
                <div className="item-image">
                  {item.imageFile ? (
                    <img src={item.imageFile} alt={item.name} />
                  ) : (
                    <span className="food-emoji">{item.image || "🍽️"}</span>
                  )}
                </div>

                <div className="item-info">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="item-price">${item.price}</div>
                </div>

                <button onClick={() => onAddToCart(item)}>➕ Add</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CART TAB */}
      {activeTab === "cart" && (
        <div className="cart-section">
          <h2>Your Order 🛒</h2>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty</p>
              <p>Add some delicious items from the menu! 🍕</p>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    {item.imageFile ? (
                      <img
                        src={item.imageFile}
                        alt={item.name}
                        className="uploaded-image"
                      />
                    ) : (
                      <span className="food-emoji">
                        {item.image || "🍽️"}
                      </span>
                    )}
                  </div>
                  <div className="cart-item-details">
                    <h4>{item.name}</h4>
                    <p>${item.price} each</p>
                  </div>
                  <div className="quantity-controls">
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity - 1)
                      }
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>
                  <div className="item-total">
                    {(item.price * item.quantity).toFixed(2)}
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveFromCart(item.id)}
                  >
                    ❌
                  </button>
                </div>
              ))}
              <div className="cart-total">
                <h3>Total: ${total}</h3>
                <button className="checkout-btn" onClick={onCheckout}>
                  🎉 Place Order & Checkout
                </button>
                <div className="pickup-notice">
                  <p>
                    📍 <strong>Pickup Order Only</strong>
                  </p>
                  <p>No delivery service - Come collect your delicious food! 🍔</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MESSAGES TAB */}
      {activeTab === "messages" && (
        <div className="messages-section">
          <h2>Chat 💬</h2>
          <div className="messages-container">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`message ${
                  message.isShopkeeper ? "shopkeeper" : "customer"
                }`}
              >
                <div className="message-header">
                  <strong>{message.user || "User"}</strong>
                  <span>{message.timestamp}</span>
                </div>
                <div className="message-text">{message.text}</div>
              </div>
            ))}
          </div>
          <div className="message-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
            />
            <button onClick={onSendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- ShopkeeperInterface ----------
const ShopkeeperInterface = ({
  menuItems,
  onAddMenuItem,
  onRemoveMenuItem,
  newMenuItem,
  setNewMenuItem,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  notifications,
  pendingOrders,
  onMarkOrderReady,
  onImageUpload,
}) => {
  const [activeTab, setActiveTab] = useState("menu");

  const handleAddMenuItem = () => {
    if (newMenuItem.name && newMenuItem.price && newMenuItem.image) {
      onAddMenuItem();
    } else {
      alert("Please fill in all required fields (Name, Price, and Image)");
    }
  };

  return (
    <div className="shopkeeper-interface">
      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={activeTab === "menu" ? "active" : ""}
          onClick={() => setActiveTab("menu")}
        >
          📋 Manage Menu
        </button>
        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          📦 Orders ({pendingOrders.length})
        </button>
        <button
          className={activeTab === "messages" ? "active" : ""}
          onClick={() => setActiveTab("messages")}
        >
          💬 Messages ({messages.filter((m) => !m.isShopkeeper).length})
        </button>
        <button
          className={activeTab === "notifications" ? "active" : ""}
          onClick={() => setActiveTab("notifications")}
        >
          🔔 Notifications ({notifications.length})
        </button>
      </div>

      {/* Menu Management Tab */}
      {activeTab === "menu" && (
        <div className="menu-management">
          <h2>Menu Management 🍽️</h2>

          {/* Add New Item Form */}
          <div className="add-item-form">
            <h3>Add New Menu Item</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Item Name *"
                value={newMenuItem.name}
                onChange={(e) =>
                  setNewMenuItem({ ...newMenuItem, name: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Price *"
                step="0.01"
                value={newMenuItem.price}
                onChange={(e) =>
                  setNewMenuItem({ ...newMenuItem, price: e.target.value })
                }
              />
              <div className="image-upload-container">
                <label className="file-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImageUpload(e, setNewMenuItem)}
                    style={{ display: "none" }}
                  />
                  📸 Upload Image
                </label>
                {newMenuItem.imageFile && (
                  <div className="image-preview">
                    <img
                      src={newMenuItem.imageFile}
                      alt="Preview"
                      className="uploaded-image"
                    />
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Description"
                value={newMenuItem.description}
                onChange={(e) =>
                  setNewMenuItem({
                    ...newMenuItem,
                    description: e.target.value,
                  })
                }
              />
              <button onClick={handleAddMenuItem} className="add-btn">
                Add Item
              </button>
            </div>
            <p
              style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}
            >
              * Required fields
            </p>
          </div>

          {/* Menu Items Grid */}
          <div className="menu-items-grid">
            {menuItems.map((item) => (
              <div key={item.id} className="shopkeeper-menu-item">
                <div className="item-header">
                  <div className="item-image">
                    {item.imageFile ? (
                      <img
                        src={item.imageFile}
                        alt={item.name}
                        className="uploaded-image"
                      />
                    ) : (
                      <span className="food-emoji">
                        {item.image || "🍽️"}
                      </span>
                    )}
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => onRemoveMenuItem(item.id)}
                  >
                    🗑️
                  </button>
                </div>
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <div className="item-price">${item.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="orders-section">
          <h2>Pending Orders 📦</h2>
          {pendingOrders.length === 0 ? (
            <div className="empty-orders">
              <p>No pending orders</p>
              <p>Waiting for customer orders... 🕐</p>
            </div>
          ) : (
            <div className="orders-list">
              {pendingOrders.map((order) => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <h3>Order #{order.id}</h3>
                    <span className="order-time">{order.timestamp}</span>
                  </div>
                  <div className="order-customer">
                    <strong>Customer:</strong> {order.customer}
                  </div>
                  <div className="order-items">
                    <strong>Items:</strong>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="order-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">
                          x{item.quantity}
                        </span>
                        <span className="item-price">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="order-total">
                    <strong>Total: ${order.total}</strong>
                  </div>
                  <div className="order-actions">
                    <button
                      className="deliver-btn"
                      onClick={() => onMarkOrderReady(order.id)}
                    >
                      ✅ Mark as Ready for Pickup
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div className="messages-section">
          <h2>Customer Messages 💬</h2>
          <div className="messages-container">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`message ${
                  message.isShopkeeper ? "shopkeeper" : "customer"
                }`}
              >
                <div className="message-header">
                  <strong>{message.user || "User"}</strong>
                  <span>{message.timestamp}</span>
                </div>
                <div className="message-text">{message.text}</div>
              </div>
            ))}
          </div>
          <div className="message-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your reply..."
              onKeyPress={(e) => e.key === "Enter" && onSendMessage()}
            />
            <button onClick={onSendMessage}>Send</button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="notifications-section">
          <h2>Notifications 🔔</h2>
          <div className="notifications-list">
            {notifications.map((notification, index) => (
              <div key={index} className="notification">
                <span>📢</span>
                <p>{notification}</p>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
