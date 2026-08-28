# KUPVA Pro

# Money Changer Information System (KUPVA BB)

## Project Overview

Build a modern, responsive, secure, and scalable web-based Money Changer Information System for a licensed KUPVA BB (Kegiatan Usaha Penukaran Valuta Asing Bukan Bank) in Indonesia.

The application should follow operational best practices and support compliance with Bank Indonesia regulations, including Know Your Customer (KYC), Customer Due Diligence (CDD), Anti Money Laundering (APU), Counter Terrorism Financing (PPT), audit trails, cash management, and transaction reporting.

The application should have a professional financial system appearance with a clean dashboard similar to banking applications.

Connect to Supabase database, Project ID: vbmdlqwplfomtzrhafrc, Publishable Key: sb_publishable_WVOw5REqyFAYq07Az1lkSQ_Hkevu_id, Secret keys: sb_secret_i8VSvkLIqsECIDX4RJ_0PA_Gkx334vj 

---

# General Requirements

Develop a responsive web application that works on:

* Desktop

* Tablet

* Mobile

Use:

* Modern UI

* Clean dashboard

* Light & Dark Mode

* Responsive Layout

* Fast loading

* Accessible UI

---

# User Roles

## 1. Super Administrator

Full system access.

Permissions:

* Manage users

* Manage branches

* Manage currencies

* Manage exchange rates

* Manage permissions

* View all reports

* View audit logs

* Configure system

---

## 2. Branch Manager / Supervisor

Permissions:

* Monitor transactions

* Approve transactions

* Approve voids

* Approve cash adjustments

* Monitor teller activities

* View reports

* Manage branch cash

---

## 3. Teller

Permissions:

* Register customer

* Perform buy/sell transactions

* Print receipt

* View own transactions

* Perform cash opening

* Perform cash closing

Cannot:

* Change exchange rates

* Delete transactions

* Access other branches

---

## 4. Auditor

Permissions:

* Read only

* View reports

* View audit logs

* Export reports

---

## 5. Owner / Director

Permissions:

* Dashboard

* Financial reports

* Branch performance

* Profit analysis

---

# Dashboard

Display:

* Total transactions today

* Total Buy

* Total Sell

* Daily Profit

* Monthly Profit

* Number of Customers

* Today's Exchange Rates

* Cash Position

* Currency Inventory

* Pending Approvals

* Suspicious Transactions

* Branch Performance

Charts:

* Daily Transactions

* Monthly Revenue

* Currency Distribution

* Top Customers

* Exchange Rate History

---

# Master Data

## Branch

Fields:

* Branch Name

* Branch Code

* Address

* Phone

* Email

* BI License Number

* Status

---

## Currency

Fields:

* Currency Code

* Currency Name

* Symbol

* Country

* Status

Examples:

USD

AUD

EUR

JPY

SGD

MYR

THB

GBP

CHF

HKD

CAD

CNY

---

## Exchange Rate

Daily exchange rates.

Fields:

* Date

* Currency

* Buy Rate

* Sell Rate

* Effective Time

* Created By

* Last Updated

Features:

* History

* Rate Versioning

* Search

* Approval

---

## Cash Register

Each teller owns a cash register.

Fields:

* Teller

* Branch

* Opening Balance

* Closing Balance

* Current Balance

* Currency

---

# Customer Management (KYC)

Customer Profile

Fields:

* Full Name

* National ID

* Passport Number

* Nationality

* Date of Birth

* Gender

* Occupation

* Address

* Phone Number

* Email

Documents

* ID Card

* Passport

* Selfie

* Additional Documents

Customer Status

* New

* Returning

* High Risk

Customer History

Display:

* All previous transactions

* Total exchanged amount

* Frequency

* Last transaction

---

# Customer Due Diligence (CDD)

If transaction exceeds company threshold:

Display additional form:

Purpose of transaction

Source of funds

Beneficial owner

Country destination

Relationship

Risk category

Automatic Risk Score

Low

Medium

High

If High Risk:

Supervisor approval required.

---

# Transaction Module

Two transaction types.

---

## Buy Foreign Currency

Customer sells foreign currency.

Example:

100 USD

Buy Rate

16,150

Total

Rp1,615,000

Flow:

Search Customer

↓

Select Currency

↓

Input Amount

↓

Auto Calculate

↓

Save

↓

Print Receipt

↓

Update Cash

↓

Update Inventory

---

## Sell Foreign Currency

Customer buys foreign currency.

Flow:

Search Customer

↓

Check Inventory

↓

Select Currency

↓

Input Amount

↓

Auto Calculate

↓

Payment

↓

Print Receipt

↓

Update Inventory

↓

Update Cash

---

# Automatic Calculation

Automatically calculate:

Exchange Amount

Rate

Admin Fee

Tax (optional)

Discount

Rounding

Total Payment

Profit Margin

Exchange Difference

---

# Currency Inventory

Monitor each currency.

Display:

Opening Balance

Incoming

Outgoing

Current Balance

Minimum Stock

Maximum Stock

Alerts

Low Stock

Out of Stock

Negative Balance

---

# Cash Management

Opening Cash

Closing Cash

Cash Adjustment

Cash Transfer

Cash Deposit

Cash Withdrawal

Cash Difference

Supervisor Approval

---

# Cash Opname

Daily process.

Opening Balance

↓

Transactions

↓

Physical Count

↓

Difference

↓

Supervisor Approval

↓

Closing

---

# Approval Workflow

Approval required for:

Large transaction

High Risk customer

Special exchange rate

Cash adjustment

Void transaction

Refund

Rate modification

---

# Void Transaction

Transactions cannot be deleted.

Only:

Void

Requirements:

Reason

Supervisor approval

Audit log

---

# Audit Trail

Record every activity.

Examples:

Login

Logout

Rate changes

Customer update

Transaction

Approval

Print receipt

Void

Export report

Nothing can be permanently deleted.

---

# Notification System

Notify users when:

Exchange rate not updated

Cash shortage

Inventory shortage

Large transaction

High Risk customer

Approval waiting

Cash difference

---

# Reporting Module

Daily Report

Weekly Report

Monthly Report

Yearly Report

Customer Report

Currency Report

Cash Report

Profit Report

Exchange Rate Report

Branch Report

Teller Report

High Risk Report

Audit Report

Cash Difference Report

Inventory Report

Top Customer Report

Top Currency Report

Export:

PDF

Excel

CSV

---

# Receipt Printing

Receipt should include:

Company Logo

Branch

Transaction Number

Date

Time

Customer Name

Currency

Exchange Rate

Amount

Total

Cashier

QR Code

Digital Verification Code

---

# System Settings

Company Profile

Company Logo

Bank Indonesia License Number

Tax Settings

Receipt Settings

Printer Settings

Currency Settings

Timezone

Language

Backup Schedule

Security Settings

Password Policy

---

# Security

Role Based Access Control (RBAC)

Encrypted passwords

Session timeout

HTTPS ready

CSRF protection

SQL Injection protection

XSS protection

Activity log

IP log

Login history

Two-factor authentication (optional)

---

# Database Design

Main entities:

Users

Roles

Permissions

Branches

Currencies

Exchange Rates

Customers

Customer Documents

Customer Risk Assessment

Transactions

Transaction Details

Cash Registers

Cash Movements

Cash Opname

Currency Inventory

Approvals

Notifications

Audit Logs

System Settings

Reports

---

# Suggested Database Relationships

User

↓

Role

↓

Branch

↓

Cash Register

Customer

↓

Customer Documents

↓

Risk Assessment

Currency

↓

Exchange Rate

↓

Inventory

Transaction

↓

Transaction Detail

↓

Approval

↓

Audit Log

---

# Main Business Flow

Login

↓

Dashboard

↓

Open Cash

↓

Update Daily Exchange Rate

↓

Customer Registration / Verification (KYC)

↓

CDD (if required)

↓

Choose Transaction

(Buy or Sell)

↓

Validate Customer

↓

Validate Exchange Rate

↓

Validate Currency Stock

↓

Automatic Calculation

↓

Supervisor Approval (if required)

↓

Save Transaction

↓

Update Cash

↓

Update Currency Inventory

↓

Print Receipt

↓

Audit Trail

↓

Cash Closing

↓

Reports

---

# UI/UX Requirements

Use a modern financial dashboard inspired by professional banking applications.

Design should include:

* Sidebar navigation

* Top navigation bar

* Dashboard cards

* Interactive charts

* Responsive tables

* Advanced filtering

* Search with autocomplete

* Pagination

* Modal dialogs

* Confirmation dialogs

* Toast notifications

* Skeleton loading

* Empty states

* Error states

Primary colors:

* Blue (#2563EB)

* Emerald (#10B981)

* White

* Light Gray

Use rounded corners, subtle shadows, modern typography, and smooth animations.

---

# Future Enhancements

Design the system with a modular architecture so it can easily support future features such as:

* Multi-company support

* Multi-country currencies

* OCR scanning for KTP/Passport

* QRIS payment integration

* Bank transfer integration

* WhatsApp receipt delivery

* Email receipt delivery

* BI exchange rate synchronization

* Automatic suspicious transaction detection

* REST API for mobile applications

* Business Intelligence (BI) dashboard

* Multi-language (Bahasa Indonesia & English)

* Cloud deployment and automatic backups

---

# Development Notes

Generate a complete full-stack application with:

* Clean folder structure

* Reusable components

* Type-safe models

* Responsive UI

* Secure authentication

* Complete CRUD operations

* Form validation

* Error handling

* Loading states

* Professional dashboard

* Sample seed data

* Well-structured database schema

* Ready for production deployment

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://valuta-guardian.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b5ada47f-c1dd-4f3b-9476-9ba950753df0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
