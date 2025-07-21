# Grant Matcher
## Introduction
*Grant Matcher* is an app built for university staff members who want to better support their university's researchers. *Grant Matcher* provides a neat and organised system to store data for researchers and grant opportunities, allowing users to find all eligible researchers for a certain grant opportunity. This will help diversify the grant opportunities your researchers apply for.

While currently only intended for staff of the University of Sydney (USYD) who support researchers from the Faculty of Science, if you are interested, you can contact me directly at flyingbutter213@gmail.com and I will provide you with a separate database.

## Legal Notice
*Grant Matcher* values the privacy of our users. We store your data in a secure PostgreSQL database and we only store what is necessary. Before adding any researcher's data to *Grant Matcher*, please ensure you have the researcher's consent to store the data related to their researcher. *Grant Matcher* has excellent security features that ensure that only USYD staff members have access to this data. 

## Tutorial
### Getting Started
#### Signup
If you don't have an account, you can go to the signup page (/signup). For security reasons, you will need an authentication code (which would have been provided to you by the manager or myself) to ensure that the right people have access to the researcher's data. This authentication code should be an 8-character mix of letters, numbers, and symbols. This is a reliable way to ensure that *Grant Matcher* stays invite-only and its data is secure. If you do not have an authentication code, please contact me at flyingbutter213@gmail.com.

In the signup page, enter your name, your university's email (should end in @sydney.edu.au), and your authentication code. Please note that to protect against XSS attacks, your name and email will automatically be filtered for any HTML tags (like <b> or </i>) and they will be removed without warning. Thank you for helping *Grant Matcher* stay secure.

Next, enter a password of your choosing. This password must be at least 5 characters long. HTML tags won't be removed in this case. Passwords are automatically hashed before being stored in the database, ensuring that your data is safe and secure.

There will be a "Remember Me" checkbox at the end of the form. If you check this, a cookie will be stored in your browser. If you do not wish to have this cookie, leave the box unchecked. This would mean that your session will expire every time you close the browser, which would result in more logins.

#### Login
To login, head to the login page (/login). Enter your university email (should end in @sydney.edu.au). This should be the same email as you used when signing up. You must also enter your password.

There will be a "Remember Me" checkbox at the end of the form. If you check this, a cookie will be stored in your browser. If you do not wish to have this cookie, leave the box unchecked. This would mean that your session will expire every time you close the browser, which would result in more logins.

#### The Dashboard
After you login or signup, you will be redirected to the dashboard (/). The dashboard contains a table for each table in *Grant Matcher*'s database. In all tables, you can search and sort the data. 

If there are too many columns, a horizontal scroll-bar will be activated so you can scroll through the table horizontally. The rows will be divided into pages, each page having five rows. Above the table, there will be some icons on the left and a sort-by dropdown on the right. Note that sorting is always in ascending order. 

At the bottom of the table, there is a download button on the left and navigation buttons on the right. Please note that the download button currently doesn't do anything and it will be implemented in the future. The navigation buttons allow you to view different pages of the table. THe first button brings you to the first page, the second one brings you to the previous page, the third one brings you to the next page, and the fourth one brings you to the last page.

1. Researchers
The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

The second icon will redirect you to the add researcher page. In this page, you can enter details to add a researcher. More details are provided in that page's dedicated section.

The third icon will redirect you to the recalculation page. Here, you can recalculate the researcher's data. The app will automatically scrape a publicly-available database, saving your team crucial time. Again, more details are provided in that page's dedicated section.

If you click on the name of the researcher, it will bring you to that researcher's dedicated page.

2. Grants
The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

The second icon will redirect you to the add grant page. In this page, you can enter details to add a grant. More details are provided in that page's dedicated section.

If you click on the name of the grant, it will bring you to that grants's dedicated page.

3. Clusters
Clusters are categories of research interests (e.g., 'climate change' or 'artificial intelligence'). These are used to better categorise and organise researchers.

The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

The second icon will redirect you to the manage clusters page. In this page, you can edit the cluster list. More details are provided in that page's dedicated section.

4. Users
The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

If you are a manager or developer, the second icon will redirect you to the manage codes page. In this page, you can manage the authentication codes. More details are provided in that page's dedicated section.

If you click on the name of the user, it will bring you to that user's dedicated page.

5. Changelog
The changelog stores all the changes that have occurred, which helps track edits and makes it easier to restore previous versions or revert previous decisions. Each change consists of the type of change (e.g., 'Researcher Added'), the user responsible for that change, the date of the change, and text involving the details about that change.

The first icon will open a search modal. Enter in the details in the search modal. Note that you do not have to fill in all of the fields in the search modal. There is also a reset button at the bottom of the modal, which will clear the fields in the modal and reset the table.

If you double-click on the row, a modal will open up providing more details about the change.

### Managing Researchers
#### Recalculating the Researcher's Data
TODO

#### Viewing Researchers
TODO

#### Adding Researchers
TODO

#### Editing Researchers
TODO

#### Deleting Researchers
TODO

### Managing Grants
#### Viewing Grants
TODO

#### Adding Grants
TODO

#### Editing Grants
TODO

#### Deleting Grants
TODO

#### Matching Grants
TODO

### Managing Users
#### Managing Codes
TODO

#### TODO
Stuff like deleting, suspending, and unsuspending users

### Managing Clusters
TODO

### Using Tickets
#### Open Tickets
TODO

#### Edit Tickets
TODO

#### Reply to Tickets
TODO

#### Edit Ticket Replies
TODO

#### Resolve Tickets
TODO

### Managing Your Account
TODO

## Conclusion
TODO