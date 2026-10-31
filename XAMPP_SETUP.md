# Codeloop - XAMPP Apache & MySQL Setup Guide

This project has been completely converted to **HTML, CSS, PHP, and MySQL** running natively on **XAMPP Apache Server**. The frontend is fully connected to the MySQL backend database through PHP PDO and RESTful APIs.

---

## 🚀 Quick Start (1-Minute Setup)

### 1. Start XAMPP Services
1. Open the **XAMPP Control Panel**.
2. Click **Start** next to **Apache**.
3. Click **Start** next to **MySQL**.

### 2. Open the Website in Your Browser
- **Public Homepage**: [http://localhost/](http://localhost/) or [http://localhost/index.php](http://localhost/index.php)
- **Admin Dashboard**: [http://localhost/admin.php](http://localhost/admin.php)
- **Admin Login**: [http://localhost/admin-login.php](http://localhost/admin-login.php)
- **API Health Check**: [http://localhost/api/healthz](http://localhost/api/healthz)

> **Automatic Database Setup**:  
> You do **not** need to manually create the database or import SQL files. When you open any page, the PHP system (`config/db.php`) will automatically detect if the database `interviewedge` exists, create it, build all required tables, and seed initial live interview listings!

---

## 🔑 Admin Login Credentials

- **Admin ID / Username**: `admin`
- **Password**: `admin123`

---

## 🗄️ Database Details

- **Database Name**: `interviewedge`
- **Host**: `127.0.0.1` (or `localhost`)
- **Port**: `3306`
- **Default User**: `root`
- **Default Password**: `""` (empty, standard for XAMPP)

### Manual Database Import (Optional)
If you wish to view or import the database manually via phpMyAdmin:
1. Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin) in your browser.
2. Click **Import**.
3. Choose the file `c:\xampp\htdocs\database.sql`.
4. Click **Go**.

---

## 📁 Project Architecture & File Structure

```
c:\xampp\htdocs\
├── .htaccess                   # Apache URL rewriting & security rules
├── database.sql                # Complete schema & sample seed data for MySQL
│
├── config/
│   ├── db.php                  # PDO MySQL connection & auto-schema initializer
│   ├── auth.php                # Session & Cookie authentication helpers
│   └── helpers.php             # JSON response, UUID, & data mapping utilities
│
├── api/
│   ├── index.php               # Master REST API router (/api/*)
│   ├── listings.php            # Public interview listings API (GET /api/listings)
│   ├── listing_detail.php      # Single listing detail API (GET /api/listings/:id)
│   ├── related.php             # Related listings API (GET /api/listings/:id/related)
│   ├── admin_login.php         # Admin login endpoint (POST /api/admin/login)
│   ├── admin_logout.php        # Admin logout endpoint (POST /api/admin/logout)
│   ├── admin_session.php       # Admin session probe (GET /api/admin/session)
│   ├── admin_listings.php      # Admin CRUD API (GET, POST, PUT, DELETE)
│   ├── categories.php          # Category management API
│   ├── questions.php           # Interview questions API
│   └── healthz.php             # Database & server health probe
│
├── Frontend Pages (PHP + HTML):
│   ├── index.php               # Primary Homepage (Live ticker, hero stats, cards grid, sidebar)
│   ├── detail.php              # Interview Detail & Application Page
│   ├── admin.php               # Admin Dashboard (Form to Add/Edit + Management Table)
│   ├── admin-login.php         # Admin Sign-In Page
│   ├── blog.php                # Interview Tips & Career Guides
│   └── contact.php             # Contact Us Page with PHP form handling
│
├── Stylesheets & Scripts:
│   ├── index.css, light-theme.css, admin.css, detail.css, blog.css, contact.css
│   ├── index.js                # Frontend dynamic search, filtering, and API consumer
│   ├── admin.js                # Admin table rendering, form submit, edit/delete actions
│   ├── admin-login.js          # Admin sign-in client handling
│   └── detail.js               # Detail page interactions & share handler
```

---

## 🛠️ Features Included

1. **Frontend Connected to MySQL**:
   - Live counters (Total, Online, Walk-in, Added Today) generated from MySQL queries.
   - Dynamic search by company, role, skills, or description.
   - Filter pills for Online, Offline, and Walk-in interviews.
   - Live ticker with up-to-date company hiring announcements.
   - Company listing sidebar showing active hiring count per company.

2. **Full CRUD Admin Panel**:
   - Add new interview drives (Company, Role, Type, Date, Location, Package, Skills tags, Apply Link, Description).
   - Edit existing listings with instant form population.
   - Delete listings with one click.
   - Instant live search in the admin listings table.

3. **Secure Authentication**:
   - Protected admin routes using PHP sessions and secure cookies.
   - Safe password verification via PHP `password_verify` (Bcrypt).
