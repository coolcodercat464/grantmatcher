# Grant Matcher
## Introduction
*Grant Matcher* is an app built for university staff members who want to better support their university's researchers. *Grant Matcher* provides a neat and organised system to store data for researchers and grant opportunities, allowing users to find all eligible researchers for a certain grant opportunity. This will help diversify the grant opportunities your researchers apply for.

While currently only intended for staff of the University of Sydney (USYD) who support researchers from the Faculty of Science, if you are interested, you can contact me directly at flyingbutter213@gmail.com and I will provide you with a separate database.

## Legal Notice
*Grant Matcher* values the privacy of our users. We store your data in a secure PostgreSQL database and we only store what is necessary. Before adding any researcher's data to *Grant Matcher*, please ensure you have the researcher's consent to store the data related to their researcher. *Grant Matcher* has excellent security features that ensure that only USYD staff members have access to this data. 

## Tutorial
### Getting Started
#### Signup
If you don't have an account, you can go to the _signup page_ (`/signup`). For security reasons, you will need an authentication code (which would have been provided to you by the manager or myself) to ensure that the right people have access to the researcher's data. This authentication code should be an 8-character mix of letters, numbers, and symbols. This is a reliable way to ensure that *Grant Matcher* stays invite-only and its data is secure. If you do not have an authentication code, please contact me at flyingbutter213@gmail.com.

In the _signup page_, enter your name, your university's email (should end in @sydney.edu.au), and your authentication code. Please note that to protect against XSS attacks, your name and email will automatically be filtered for any HTML tags and they will be removed without warning. Thank you for helping *Grant Matcher* stay secure.

Next, enter a password of your choosing. This password must be at least 5 characters long. HTML tags won't be removed in this case. Passwords are automatically hashed before being stored in the database, ensuring that your data is safe and secure.

There will be a "Remember Me" checkbox at the end of the form. If you check this, a cookie will be stored in your browser. If you do not wish to have this cookie, leave the box unchecked. This would mean that your session will expire every time you close the browser, which would result in more logins.

#### Login
To login, head to the _login page_ (`/login`). Enter your university email (should end in @sydney.edu.au). This should be the same email as you used when signing up. You must also enter your password.

There will be a "Remember Me" checkbox at the end of the form. If you check this, a cookie will be stored in your browser. If you do not wish to have this cookie, leave the box unchecked. This would mean that your session will expire every time you close the browser, which would result in more logins.

#### The Dashboard
After you login or signup, you will be redirected to the _dashboard_ (`/`). The _dashboard_ contains a table for each table in *Grant Matcher*'s database. In all tables, you can search and sort the data. 

If there are too many columns, a horizontal scroll-bar will be activated so you can scroll through the table horizontally. The rows will be divided into pages, each page having five rows. Above the table, there will be some icons on the left and a sort-by dropdown on the right. Note that sorting is always in ascending order. 

At the bottom of the table, there is a download button on the left and navigation buttons on the right. Clicking this button would download a CSV file of the data in the table. The navigation buttons allow you to view different pages of the table. THe first button brings you to the first page, the second one brings you to the previous page, the third one brings you to the next page, and the fourth one brings you to the last page.

1. Researchers

The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

The second icon will redirect you to the _add researcher page_. In this page, you can enter details to add a researcher. More details are provided in that page's dedicated section.

The third icon will redirect you to the _recalculation page_. Here, you can recalculate the researcher's data. The app will automatically scrape a publicly-available database, saving your team crucial time. Again, more details are provided in that page's dedicated section.

If you click on the name of the researcher, it will bring you to that researcher's dedicated page.

2. Grants

The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

The second icon will redirect you to the _add grant page_. In this page, you can enter details to add a grant. More details are provided in that page's dedicated section.

If you click on the name of the grant, it will bring you to that grants's dedicated page.

3. Clusters

Clusters are categories of research interests (e.g., 'climate change' or 'artificial intelligence'). These are used to better categorise and organise researchers.

The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

The second icon will redirect you to the _manage clusters page_. In this page, you can edit the cluster list. More details are provided in that page's dedicated section.

4. Users

The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

If you are a manager or developer, the second icon will redirect you to the _manage codes page_. In this page, you can manage the authentication codes. More details are provided in that page's dedicated section.

If you click on the name of the user, it will bring you to that user's dedicated page.

5. Changelog

The changelog stores all the changes that have occurred, which helps track edits and makes it easier to restore previous versions or revert previous decisions. Each change consists of the type of change (e.g., 'Researcher Added'), the user responsible for that change, the date of the change, and text involving the details about that change.

The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

If you double-click on the row, a modal will open up providing more details about the change.

### Form Elements
#### Cluster Selector
Cluster selectors allow you to quickly and easily select clusters. It consists of two lists. Blue clusters in the blue list are unselected and pink clusters in the pink list are selected. To select or unselect a cluster, simply click it, and it will move between the lists. You can sort and search each list separately. To search, simply type in the cluster's name and press the search button. You can reset the list by clicking the refresh icon next to eh search icon.

#### Keyword Selector
Keyword selectors allow you to quickly and easily add a list of keywords. To add a keyword, type it into the input field and press the button next to it. A new keyword will be displayed in the list. To remove it, click the trash icon next to the keyword. There are also editable keyword selectors, which also allow you to edit the contents of each keyword. These are only used in the manage clusters page.

### Managing Researchers
#### Recalculating the Researcher's Data
With *Grant Matcher*, you don't have to spend hours manually adding researchers. Instead, you can head to the _recalculation page_ (`/recalculate`) and let *Grant Matcher* add researchers for you! When recalculating the researcher's data, the app scrapes the researcher's data off a publicly-avaiable database on USYD's site.

In the recalculation page, there is a table of researchers who you can select for recalculation. You can select researchers by checking the checkbox on their row (you might have to scroll horizontally to see it). If you select some researchers, only those researcher's data will be overwritten. There is a blue button underneath the table that allows you to select all researchers. This would only allow the app to edit the existing researchers, rather than adding new researchers. However, if you don't select any researchers, the app will overwrite the information of all researchers it finds on the database. There is also a select all button. 

Next, you have to select the fields you want to recalculate. Other fields will be left untouched. Note that name and email are automatically calculated no matter what. Additionally, if you select "Clusters" or "Keywords," you will have to provide a few more parameters (the forms for these parameters will pop up when you select those fields). 

Finally, press recalculate. It might take approximately ~30 seconds to finish. Afterwards, another table would appear, containing the recalculated data of the researchers. You can go through these, check that they all make sense, then check the checkbox on the row to confirm that researcher's edits. Alternatively, you can press the blue button below the table to confirm all researchers. Once you are happy with the researchers you have confirmed, finalise your changes by pressing the pink button below the table.

#### Viewing Researchers
You can view a researcher's data by clicking on the link present in the researchers' table (see more in the Dashboard section). This is the _researcher page_ (`/researcher/:researcherEmail`). Next to the researcher's name should be a download button, which downloads a CSV file of the researcher's data. To the right of the download button are two icons. The first one sends you to the _edit researcher page_, and the second one opens a modal to delete the researcher. Simply enter the reason you want to delete this researcher and the researcher will be removed from the database. Please note that this action is irreversible.

In this page, you can see all of the researcher's information. Under this should be the Version Information section. This consists of an accordion which stores all previous versions of the researcher's data. The reason for the most recent edit is shown above the accordion. The reason for the other edits are shown in the accordion items.

#### Adding Researchers
In the researchers' table in the _dashboard_, you can click the plus-sign icon to go to the _add researcher page_ (`/addresearcher`). You must fill in all text-input, number, and dropdown fields. However, the cluster and keyword selectors are all optional. Once you add the researcher, you will be redirected to their page (see above for more details).

#### Editing Researchers
The _edit researcher page_ (`/editresearcher/:researcherEmail`) looks exactly the same as the _add researcher page_, but this time all the fields are filled in with their current values. Additionally, you also have to state the reason you are editing this researcher. Once you filled in all fields, you can confirm your changes and you will be redirected to their page.

#### Deleting Researchers
You can delete researchers by heading to their page and clicking the trash icon next to their name. A modal will be opened. Enter the reason you want to delete this researcher and the researcher will be removed from the database. Please note that this action is irreversible.

### Managing Grants
#### Viewing Grants
You can view a grant's data by clicking on the link present in the grants' table (see more in the Dashboard section). This is the _grant page_ (`/grant/:grantID`). Next to the grant's name should be a download button, which downloads a CSV file of the grant's data. To the right of the download button are three icons. The first one sends you to the _edit grant page_, the second one sends you to the _match grant page_, and the third one opens a modal to delete the grant. Simply enter the reason you want to delete this grant and the grant will be removed from the database. Please note that this action is irreversible.

In this page, you can see all of the grant's information. Under this should be the Version Information section. This consists of an accordion which stores all previous versions of the grant's data. The reason for the most recent edit is shown above the accordion. The reason for the other edits are shown in the accordion items.

#### Adding Grants
In the grants' table in the _dashboard_, you can click the plus-sign icon to go to the _add grant page_ (`/addgrant`). You must fill in all text, number, date, and dropdown fields. However, the cluster and keyword selectors are all optional. Once you add the grant, you will be redirected to its page (see above for more details).

#### Editing Grants
The _edit grant page_ (`/editgrant/:grantID`) looks exactly the same as the _add grant page_, but this time all the fields are filled in with its current values. Additionally, you also have to state the reason you are editing this grant. Once you filled in all fields, you can confirm your changes and you will be redirected to its page.

#### Deleting Grants
You can delete grants by heading to its page (`/grant/:grantID`) and clicking the trash icon next to its name. A modal will be opened. Enter the reason you want to delete this grant and the grant will be removed from the database. Please note that this action is irreversible.

#### Matching Grants
Matching grants are one of the core features of *Grant Matcher*. This allows you to match researchers to a particular grant. In the _match grant page_ (`/match/:grantID`), the first step is to do preliminary filtering. This will 'hard-filter' the researchers, meaning that any researchers who don't fit the criteria will be immediately excluded. The form for preliminary filtering is similar to the search modal above the researchers' table in the _dashboard_ (and works in a similar way too). The remaining researchers form a candidate pool. 

The next stage is a 'soft-filter,' which is more flexible and assigns each researcher in the candidate pool a relevancy score. The higher this score, the more likely they are to be eligible for the grant. For 'soft-filtering,' you have to enter some keywords that the researchers must be relevant with. Note the grants keywords would have automatically been added to the keyword selector. Next, you have to choose either `number` or `strictness`. If you provide `number`, then the top `number` researchers will be displayed. If you provide `strictness`, the bottom `strictness`% of researchers will be discarded. These form the cutoff parameters. 

Finally, you can pick either *Direct Matching* or *Cluster Matching*. *Direct Matching* works by directly comparing the researcher's keywords with the keywords you provided. *Cluster Matching* works by comparing the keywords you provided with clusters, and then comparing those clusters with the researchers' clusters. If you don't have many clusters, use *Direct Matching* or add some clusters before using *Cluster Matching*. Note that *Direct Matching* tends to be more specific.

After approximately ~15 seconds of computation time, a table will be displayed showing the details of all the researchers who were found. You can order the researchers by score and head to the last page to look at the highest-scoring researchers. Please note that the program's goal is to avoid false negatives so relevant researchers won't miss out, meaning that some irrelevant researchers might appear in the table. Simply ignore them and only select all relevant researchers. Once you are done, click the email button. This will update the database and open Outlook in a separate tab. The email sof the researchers you have selected would have been copied into your clipboard, so you can paste them into the recipients in Outlook and send them an email informing them about the grant opportunity.

### Managing Users
#### Managing Codes
If you are a manager or a developer, you can click the second icon above the users' table to head to the _manage codes page_ (`/managecodes`). See more about authentication codes in the *Getting Started* section. Essentially, they allow *Grant Matcher* to be invite-only. To invite a person to Grant Matcher, you need to add a code for them. Click the plus-sign icon above the table, then enter the new user's email and their role (user, manager, or developer). An authentication code will be randomly generated and shown to you. You can copy the code and send it to the new user, which will let them signup to *Grant Matcher*. 

You can also see all of the codes in the table. Click the search button above the table to open a search modal to search for codes. In the table, there is a column called `claimed`, which tells you whether that code has been used already or not, acting as a useful security feature. Another important column is the delete column (you might have to scroll horizontally to find it). Clicking that icon will open a confirmation modal before deleting that code. When you remove a code, that means it can't be used to signup. Feel free to delete all claimed codes. 

#### Viewing Users
In the _user page_ (`user/:userEmail`), you can also view each user's information, such as:
- Name
- Email
- XP
- Role
- Number of Grants Matched
- Date Joined

#### Editing Users
If you are a manager or a developer, you can also edit a user's information, such as:
- Name
- XP
- Role
- Number of Grants Matched

Forms to edit these fields are also present in the _user page_. Note that you are required to enter a reason for your changes. Additionally, you can't edit the developer's role unless you are a developer. You also can't edit your own role or XP unless you are a developer.

#### Deleting Users
If you are a manager or a developer, you can delete users in the _user page_. Simply scroll all the way down to the *Danger Zone*, then click the "Delete Account" button. A modal should appear. After you enter the reason why you want to delete the user, the user will be deleted.

#### Suspending Users
If you are a manager or a developer, you can suspend users in the _user page_. Simply scroll all the way down to the *Danger Zone*, then click the "Suspend" button. A modal should appear. You must enter (1) how many days they will be suspended, (2) the role they will return as, and (3) the reason for the suspension. 

If the user is already suspended, you can suspend them again but it will override the previous suspension details. The app will warn you if they have already been suspended. To unsuspend users, simply change their role to a user, manager, or a developer.

### Managing Clusters
In the clusters' table in the _dashboard_, click the edit button to go to the _manage clusters page_ (`/manageclusters`). All the clusters will be automatically added to an editable keyword selector, allowing you to add, remove, and edit the clusters. Finally, press the pink button to confirm your changes.

### Using Tickets
#### View Tickets
Tickets are a way to report errors and ask questions about *Grant Matcher*. To go to the _tickets_ (`/tickets`), click the "Tickets" link in the navigation bar or in the footer. If you are on a mobile view, you might have to click the hamburger menu first to view the links. 

A table containing all the tickets will be displayed in _tickets_. Like all other tables, you can search, sort, and navigate through it. Each ticket will either have a ✅ symbol or a ⭕ symbol. ✅ means the ticket has been resolved and the ticket is locked, while ⭕ means that the ticket is unresolved and the poster is still waiting for a solution.

#### Open Tickets
To open a new ticket, click the plus-sign icon in _tickets_ above the table. Fill in all the fields. Tags refers to some broad categories that your ticket might fall into (you can select more than one). You can also select members, who are other people who can view your ticket. By default, you and the developer are automatically added as members, but you can also add other members.

Note there are multi-select dropdown. To select multiple values, hold down `ctrl` when clicking.

#### View a Ticket
To view a specific ticket, click the link to the ticket in _tickets_. You will be redirected to the _ticket page_ (`/ticket/:ticketID`). In the first section, you can see the ticket title, the date, the poster, and the content. On the right side, you can also hover over the "+ `number` others" text to see the members.

The second section is the Version Information. This consists of an accordion which stores all previous versions of the ticket's data. The reason for the most recent edit is shown above the accordion. The reason for the other edits are shown in the accordion items.

The last section is the replies to the ticket. You can see each of the replies in boxes. Underneath all the replies, there is a text area where you can send your own reply.

#### Edit Tickets
If you are the ticket poster, you can also see an edit icon in the top right corner of the _ticket page_ of your ticket. Clicking that would open a modal. This modal looks exactly the same as the modal where you opened your ticket, but this time all the fields are filled in with its current values. Additionally, you also have to state the reason you are editing this ticket. Once you filled in all fields, you can confirm your changes and the window will be refreshed.

#### Reply to Tickets
If you want to reply to a ticket, scroll down to the end of the _ticket page_ and type your reply in the text area. You highlight text and click on some of the formatting buttons to format it. However, please note that your reply won't be rendered properly if you nest the formatting (e.g., but an italic inside a bold). The window will be reloaded.

#### Edit Ticket Replies
In the _ticket page_, all your replies should have a pink edit button. Clicking that button will open a modal. Change the content of your reply and state your reason for editing the reply. The window will be reloaded.

#### View Reply Edits
To view a ticket reply's version history, click the grey button in the reply whose history you want to view. A modal containing the reply's Version Information will pop up. This consists of an accordion which stores all previous versions of the reply's content. The reason for the most recent edit is shown above the accordion. The reason for the other edits are shown in the accordion items.

#### Resolve Tickets
If you are the ticket poster and you have found a solution and wish to resolve your ticket, click the "Resolve Ticket" button in the _ticket page_. A modal will pop-up. Enter why you wish to resolve your ticket, explaining what conclusion was reached, and provide the most helpful reply and ticket member. 

The dropdown for selecting the most helpful reply contains the reply numbers. You can exit the modal and find the reply number (#1 for the first reply, #2 for the second reply, and so on) of the reply you wish to select. Each reply has the reply number displayed. Note that your progress will be saved if you exit the modal.

### Managing Your Account
To manage your own account, click the user icon in the navigation bar (you might have to click the hamburger icon first if you are on a mobile phone), then click the "Profile" option in the dropdown. This will send you to the _profile page_ (`/profile`).

To edit your name, simply change your name under the "Edit Name" section. You can also change your password, but you do need your current password to change it. Please make sure you remember your new password since you can't change it otherwise. It is a great idea to have a password manager.

Underneath these edit forms, you can see some information about your account, such as your XP and role.

Finally, there is the Danger Zone where you can delete your account. If you choose to delete your account, you must provide a reason why. This action is irreversible.

### Errors
If the site crashes, you will see this:
`{status: 'error', alert: 'Something went wrong. Please try again. If this problem persists, please email me at flyingbutter213@gmail.com.'}`

If this appears, please email me. All errors are automatically sent to my email, so I will get errors fixed ASAP.

## Conclusion
Thank you for reading through the documentation! I hope that you enjoy using *Grant Matcher* and it is useful for supporting your researchers and diversifying your grants.

If you have any questions about the site or want to report any errors, please open a ticket in *Grant Matcher* or email me at flyingbutter213@gmail.com.