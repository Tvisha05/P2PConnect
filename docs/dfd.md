# Data Flow Diagrams

## Peer Connect - DFD Document

---

## 1. Context Diagram (Level 0 DFD)

The context diagram shows the system as a single process with external entities.

```mermaid
graph LR
    Student((Student))
    Admin((Admin))
    GmailSMTP[(Gmail SMTP)]
    Cloudinary[(Cloudinary)]
    CronService((Cron Service))

    Student -->|"Register, Login,<br/>Post Doubt, Claim Doubt,<br/>Chat Messages, Votes,<br/>Bookmarks, Reports"| PeerConnect["Peer Connect<br/>System"]
    PeerConnect -->|"Feed, Doubt Details,<br/>Chat Messages, Notifications,<br/>Profiles, Leaderboard"| Student

    Admin -->|"Manage Users, Moderate,<br/>Approve Tags, Configure,<br/>Create Announcements"| PeerConnect
    PeerConnect -->|"Analytics, Reports Queue,<br/>Tag Queue, User List"| Admin

    PeerConnect -->|"Verification Emails,<br/>Notification Emails,<br/>Announcement Emails"| GmailSMTP
    GmailSMTP -->|"Delivery Status"| PeerConnect

    PeerConnect -->|"Upload Files<br/>via API"| Cloudinary
    Cloudinary -->|"Secure URLs"| PeerConnect

    CronService -->|"Trigger Auto-resolve"| PeerConnect
    PeerConnect -->|"Stale Doubts Resolved"| CronService
```

---

## 2. Level 1 DFD - System Decomposition

The system is decomposed into 8 major processes.

```mermaid
graph TB
    %% External Entities
    Student((Student))
    Admin((Admin))
    Gmail[(Gmail SMTP)]
    Storage[(Cloudinary)]
    Cron((Cron))

    %% Data Stores
    DB_Users[(D1: Users)]
    DB_Doubts[(D2: Doubts)]
    DB_Messages[(D3: Messages)]
    DB_Tags[(D4: Tags &<br/>Categories)]
    DB_Notif[(D5: Notifications)]
    DB_Karma[(D6: Karma<br/>Events)]
    DB_Reports[(D7: Reports)]
    DB_Config[(D8: System<br/>Config)]

    %% Processes
    P1["1.0<br/>Authentication<br/>System"]
    P2["2.0<br/>Doubt<br/>Management"]
    P3["3.0<br/>Help Lifecycle<br/>& Chat"]
    P4["4.0<br/>Social<br/>Features"]
    P5["5.0<br/>Notification<br/>System"]
    P6["6.0<br/>Karma<br/>System"]
    P7["7.0<br/>Admin<br/>Panel"]
    P8["8.0<br/>Auto-resolve<br/>Service"]

    %% Authentication flows
    Student -->|"Credentials"| P1
    P1 -->|"Session/JWT"| Student
    P1 -->|"Read/Write User"| DB_Users
    P1 -->|"Send Verification"| Gmail

    %% Doubt Management flows
    Student -->|"Doubt Data,<br/>Files"| P2
    P2 -->|"Feed, Search Results,<br/>Doubt Details"| Student
    P2 -->|"Read/Write"| DB_Doubts
    P2 -->|"Read Categories"| DB_Tags
    P2 -->|"Upload Files"| Storage
    P2 -->|"Check Rate"| DB_Config

    %% Help Lifecycle & Chat flows
    Student -->|"Claim, Chat Messages,<br/>Resolve, Dismiss, Abandon"| P3
    P3 -->|"Chat Stream,<br/>Status Updates"| Student
    P3 -->|"Read/Write"| DB_Doubts
    P3 -->|"Read/Write"| DB_Messages
    P3 -->|"Trigger Karma"| P6
    P3 -->|"Trigger Notification"| P5

    %% Social Features flows
    Student -->|"Votes, Bookmarks,<br/>Reports, Tag Suggestions"| P4
    P4 -->|"Vote Counts, Bookmarks,<br/>Leaderboard, Profiles"| Student
    P4 -->|"Read/Write"| DB_Doubts
    P4 -->|"Read/Write"| DB_Tags
    P4 -->|"Write"| DB_Reports
    P4 -->|"Trigger Karma"| P6
    P4 -->|"Read"| DB_Users

    %% Notification System flows
    P5 -->|"In-App Notifications"| Student
    P5 -->|"Read/Write"| DB_Notif
    P5 -->|"Check Preferences"| DB_Users
    P5 -->|"Send Email"| Gmail

    %% Karma System flows
    P6 -->|"Read/Write"| DB_Karma
    P6 -->|"Update User Karma"| DB_Users
    P6 -->|"Read Config"| DB_Config

    %% Admin Panel flows
    Admin -->|"Management Actions"| P7
    P7 -->|"Analytics, Queues"| Admin
    P7 -->|"Read/Write"| DB_Users
    P7 -->|"Read/Write"| DB_Doubts
    P7 -->|"Read/Write"| DB_Reports
    P7 -->|"Read/Write"| DB_Tags
    P7 -->|"Read/Write"| DB_Config
    P7 -->|"Trigger Notification"| P5
    P7 -->|"Send Announcement"| Gmail

    %% Auto-resolve flows
    Cron -->|"Trigger"| P8
    P8 -->|"Read Config"| DB_Config
    P8 -->|"Read/Update Stale"| DB_Doubts
    P8 -->|"Trigger Notification"| P5
    P8 -->|"Trigger Karma"| P6
```

---

## 3. Level 2 DFDs - Process Decomposition

### 3.1 Process 1.0 - Authentication System

```mermaid
graph TB
    Student((Student))
    DB_Users[(D1: Users)]
    DB_Tokens[(D1a: Verification<br/>Tokens)]
    Gmail[(Gmail SMTP)]

    P1_1["1.1<br/>Register<br/>User"]
    P1_2["1.2<br/>Verify<br/>Email"]
    P1_3["1.3<br/>Login"]
    P1_4["1.4<br/>Forgot<br/>Password"]
    P1_5["1.5<br/>Reset<br/>Password"]

    Student -->|"Name, Email, Password"| P1_1
    P1_1 -->|"Create User Record"| DB_Users
    P1_1 -->|"Create Verification Token"| DB_Tokens
    P1_1 -->|"Send Verification Email"| Gmail
    P1_1 -->|"Registration Success"| Student

    Student -->|"Verification Token"| P1_2
    P1_2 -->|"Validate Token"| DB_Tokens
    P1_2 -->|"Set emailVerified"| DB_Users
    P1_2 -->|"Verification Result"| Student

    Student -->|"Email, Password"| P1_3
    P1_3 -->|"Lookup User"| DB_Users
    P1_3 -->|"JWT Session"| Student

    Student -->|"Email"| P1_4
    P1_4 -->|"Lookup User"| DB_Users
    P1_4 -->|"Create Reset Token"| DB_Tokens
    P1_4 -->|"Send Reset Email"| Gmail

    Student -->|"Token, New Password"| P1_5
    P1_5 -->|"Validate Token"| DB_Tokens
    P1_5 -->|"Update Password Hash"| DB_Users
    P1_5 -->|"Reset Success"| Student
```

### 3.2 Process 2.0 - Doubt Management

```mermaid
graph TB
    Student((Student))
    DB_Doubts[(D2: Doubts)]
    DB_Tags[(D4: Tags)]
    DB_Attach[(D2a: Doubt<br/>Attachments)]
    DB_Config[(D8: Config)]
    DB_Rate[(D8a: Rate<br/>Limits)]
    Storage[(Cloudinary)]

    P2_1["2.1<br/>Create<br/>Doubt"]
    P2_2["2.2<br/>Edit<br/>Doubt"]
    P2_3["2.3<br/>Delete<br/>Doubt"]
    P2_4["2.4<br/>Browse<br/>Feed"]
    P2_5["2.5<br/>Search<br/>Doubts"]
    P2_6["2.6<br/>Similar<br/>Suggestions"]

    Student -->|"Title, Desc, Tags,<br/>Urgency, Files"| P2_1
    P2_1 -->|"Check Rate Limit"| DB_Rate
    P2_1 -->|"Read Max Rate"| DB_Config
    P2_1 -->|"Validate Tags"| DB_Tags
    P2_1 -->|"Upload Files"| Storage
    P2_1 -->|"Store File Refs"| DB_Attach
    P2_1 -->|"Create Doubt"| DB_Doubts
    P2_1 -->|"Doubt Created"| Student

    Student -->|"Updated Fields"| P2_2
    P2_2 -->|"Check Eligibility"| DB_Doubts
    P2_2 -->|"Update Doubt"| DB_Doubts

    Student -->|"Doubt ID"| P2_3
    P2_3 -->|"Check Eligibility"| DB_Doubts
    P2_3 -->|"Delete Record"| DB_Doubts
    P2_3 -->|"Delete Files"| Storage

    Student -->|"Filters, Sort, Page"| P2_4
    P2_4 -->|"Query with Filters"| DB_Doubts
    P2_4 -->|"Doubt List"| Student

    Student -->|"Search Keywords"| P2_5
    P2_5 -->|"Full-text Search"| DB_Doubts
    P2_5 -->|"Search Results"| Student

    Student -->|"Title (as typing)"| P2_6
    P2_6 -->|"Similarity Query"| DB_Doubts
    P2_6 -->|"Similar Doubts"| Student
```

### 3.3 Process 3.0 - Help Lifecycle & Chat

```mermaid
graph TB
    Student((Student))
    DB_Doubts[(D2: Doubts)]
    DB_Messages[(D3: Messages)]
    DB_Dismiss[(D3a: Helper<br/>Dismissals)]
    DB_Abandon[(D3b: Abandon<br/>Requests)]
    KarmaSystem["6.0 Karma<br/>System"]
    NotifSystem["5.0 Notification<br/>System"]
    Storage[(Cloudinary)]
    Realtime["Firebase<br/>Realtime DB"]

    P3_1["3.1<br/>Claim<br/>Doubt"]
    P3_2["3.2<br/>Send<br/>Message"]
    P3_3["3.3<br/>Resolve<br/>Doubt"]
    P3_4["3.4<br/>Dismiss<br/>Helper"]
    P3_5["3.5<br/>Abandon<br/>Doubt"]
    P3_6["3.6<br/>Review<br/>Abandon"]

    Student -->|"Doubt ID"| P3_1
    P3_1 -->|"Check: status OPEN,<br/>claim count < 3"| DB_Doubts
    P3_1 -->|"Set helper, status=CLAIMED"| DB_Doubts
    P3_1 -->|"Notify Seeker"| NotifSystem
    P3_1 -->|"Claim Confirmed"| Student

    Student -->|"Message Content,<br/>Attachments"| P3_2
    P3_2 -->|"Store Message"| DB_Messages
    P3_2 -->|"Upload Attachments"| Storage
    P3_2 -->|"If 1st msg: status=IN_PROGRESS"| DB_Doubts
    P3_2 -->|"Update lastActivityAt"| DB_Doubts
    P3_2 -->|"Broadcast Message"| Realtime
    P3_2 -->|"Notify Other Party"| NotifSystem

    Student -->|"Mark Resolved"| P3_3
    P3_3 -->|"Set status=RESOLVED"| DB_Doubts
    P3_3 -->|"Award Helper Karma"| KarmaSystem
    P3_3 -->|"Award Seeker Karma"| KarmaSystem
    P3_3 -->|"Notify Helper"| NotifSystem

    Student -->|"Dismiss Reason"| P3_4
    P3_4 -->|"Record Dismissal"| DB_Dismiss
    P3_4 -->|"Set status=OPEN, clear helper"| DB_Doubts
    P3_4 -->|"Penalty to Seeker"| KarmaSystem
    P3_4 -->|"Notify Helper"| NotifSystem

    Student -->|"Abandon Reason"| P3_5
    P3_5 -->|"Create AbandonRequest"| DB_Abandon
    P3_5 -->|"Notify Seeker"| NotifSystem

    Student -->|"Approve/Disapprove"| P3_6
    P3_6 -->|"Update AbandonRequest"| DB_Abandon
    P3_6 -->|"Set status=OPEN, clear helper"| DB_Doubts
    P3_6 -->|"If disapproved: penalty"| KarmaSystem
    P3_6 -->|"Notify Helper"| NotifSystem
```

### 3.4 Process 4.0 - Social Features

```mermaid
graph TB
    Student((Student))
    DB_Doubts[(D2: Doubts)]
    DB_Messages[(D3: Messages)]
    DB_Votes[(D4a: Votes)]
    DB_Bookmarks[(D4b: Bookmarks)]
    DB_Tags[(D4: Tags)]
    DB_Reports[(D7: Reports)]
    DB_Users[(D1: Users)]
    KarmaSystem["6.0 Karma<br/>System"]

    P4_1["4.1<br/>Vote on<br/>Content"]
    P4_2["4.2<br/>Bookmark<br/>Doubt"]
    P4_3["4.3<br/>Report<br/>Content"]
    P4_4["4.4<br/>Tag<br/>Management"]
    P4_5["4.5<br/>View<br/>Leaderboard"]
    P4_6["4.6<br/>View<br/>Profile"]

    Student -->|"Vote (+1/-1) on<br/>Doubt or Message"| P4_1
    P4_1 -->|"Upsert Vote"| DB_Votes
    P4_1 -->|"Update upvoteCount/<br/>downvoteCount"| DB_Doubts
    P4_1 -->|"Update upvoteCount/<br/>downvoteCount"| DB_Messages
    P4_1 -->|"Karma to Author"| KarmaSystem

    Student -->|"Toggle Bookmark"| P4_2
    P4_2 -->|"Upsert/Delete"| DB_Bookmarks

    Student -->|"Report Reason"| P4_3
    P4_3 -->|"Create Report"| DB_Reports

    Student -->|"Suggest Tag,<br/>Vote on Tag,<br/>Follow Tag"| P4_4
    P4_4 -->|"Read/Write"| DB_Tags

    Student -->|"Scope, Period"| P4_5
    P4_5 -->|"Read Karma Data"| DB_Users
    P4_5 -->|"Leaderboard"| Student

    Student -->|"User ID"| P4_6
    P4_6 -->|"Read User Data"| DB_Users
    P4_6 -->|"Read User's Doubts"| DB_Doubts
    P4_6 -->|"Profile Data"| Student
```

### 3.5 Process 7.0 - Admin Panel

```mermaid
graph TB
    Admin((Admin))
    DB_Users[(D1: Users)]
    DB_Doubts[(D2: Doubts)]
    DB_Reports[(D7: Reports)]
    DB_Tags[(D4: Tags)]
    DB_Config[(D8: Config)]
    NotifSystem["5.0 Notification<br/>System"]
    KarmaSystem["6.0 Karma<br/>System"]
    Gmail[(Gmail SMTP)]

    P7_1["7.1<br/>Analytics<br/>Dashboard"]
    P7_2["7.2<br/>User<br/>Management"]
    P7_3["7.3<br/>Report<br/>Moderation"]
    P7_4["7.4<br/>Tag<br/>Approval"]
    P7_5["7.5<br/>Announcements"]
    P7_6["7.6<br/>System<br/>Config"]

    Admin -->|"View Dashboard"| P7_1
    P7_1 -->|"Count Queries"| DB_Users
    P7_1 -->|"Count Queries"| DB_Doubts
    P7_1 -->|"Count Queries"| DB_Reports
    P7_1 -->|"Analytics Data"| Admin

    Admin -->|"Search, Ban, Role Change"| P7_2
    P7_2 -->|"Read/Update Users"| DB_Users
    P7_2 -->|"Karma Adjustment"| KarmaSystem
    P7_2 -->|"Notify User"| NotifSystem

    Admin -->|"Review, Action"| P7_3
    P7_3 -->|"Read/Update Reports"| DB_Reports
    P7_3 -->|"Remove Content"| DB_Doubts
    P7_3 -->|"Ban User"| DB_Users
    P7_3 -->|"Notify Reporter/Target"| NotifSystem

    Admin -->|"Approve/Reject"| P7_4
    P7_4 -->|"Update Tag Status"| DB_Tags
    P7_4 -->|"Karma to Suggester"| KarmaSystem
    P7_4 -->|"Notify Suggester"| NotifSystem

    Admin -->|"Create Announcement"| P7_5
    P7_5 -->|"Notify All Users"| NotifSystem
    P7_5 -->|"Send Bulk Email"| Gmail

    Admin -->|"Update Settings"| P7_6
    P7_6 -->|"Update Config"| DB_Config
```

---

## 4. Data Store Dictionary

| ID | Name | Description | Key Tables |
|----|------|-------------|------------|
| D1 | Users | User accounts, profiles, auth data | User, Account, Session, VerificationToken, EmailPreference |
| D2 | Doubts | Academic queries and attachments | Doubt, DoubtAttachment, DoubtTag |
| D3 | Messages | Chat messages and attachments | Message, MessageAttachment, MessageReadReceipt |
| D4 | Tags & Categories | Taxonomy and follow relationships | Category, Tag, TagVote, UserCategory, UserTag |
| D5 | Notifications | In-app notification records | Notification |
| D6 | Karma Events | Karma audit trail | KarmaEvent |
| D7 | Reports | Content/user reports | Report |
| D8 | System Config | Admin-configurable settings | SystemConfig, RateLimit, Announcement |

---

## 5. Data Flow Summary

### External Data Flows

| From | To | Data | Description |
|------|-----|------|-------------|
| Student | System | Credentials | Registration and login data |
| Student | System | Doubt data | Title, description, tags, urgency, files |
| Student | System | Chat messages | Text, markdown, files, replies |
| Student | System | Interactions | Votes, bookmarks, reports, tag votes |
| System | Student | Feed/search results | Paginated doubt listings |
| System | Student | Chat stream | Real-time messages via WebSocket |
| System | Student | Notifications | In-app notification list |
| Admin | System | Management actions | Ban, role change, moderate, configure |
| System | Admin | Dashboard data | Analytics, report queue, tag queue |
| System | Gmail | Emails | Verification, notifications, announcements |
| Student | Cloudinary | Files | Upload via API route |
| System | Cloudinary | Upload URLs | Cloudinary secure URLs returned after upload |
| Cron | System | Trigger | Hourly auto-resolve check |
