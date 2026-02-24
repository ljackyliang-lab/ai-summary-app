## Section 6: Supabase Object Store
Supabase is an open-source Firebase alternative that provides developers with a complete backend-as-a-service platform centered around PostgreSQL, a powerful relational database system offering full SQL capabilities, real-time subscriptions, and robust extensions for scalable data management. Its object storage is an S3-compatible service designed for storing and serving files like images, videos, and user-generated content.

Website: https://supabase.com/

***Github repository: https://github.com/ljackyliang-lab/ai-summary-app/tree/main/my-app***
***Vercel Deployment: https://my-eoomp9iod-ljackyliang-5760s-projects.vercel.app***

**Requirements**:
- Build a document upload and file management system powered by Supabase. The backend will include API endpoints to interact with Supabse.
- **Note:** The detailed requirement will be discussed in week 4 lecture.
- Make regular commits to the repository and push the update to Github.
- Capture and paste the screenshots of your steps during development and how you test the app. Show a screenshot of the documents stored in your Supabase Object Database.

Test the app in your local development environment, then deploy the app to Vercel and ensure all functionality works as expected in the deployed environment.

**Steps with major screenshots:**

1. **Setup Supabase Storage**:
   - Created a new public bucket named `files` in the Supabase dashboard.
   - Configured policies to allow authenticated users to upload and view files.

>![Database policies](./task-image/image_20.png)
Policies are set in the database that define what permissions a logged in user has.

>Supabase Column:
![Database table column](./task-image/image_7.png)

>Supabase Schema:
![Database table schema](./task-image/image_10.png)
In the database I will set up a separate profile table where the user id will be linked to documents, this will ensure that a user can save his/her own documents after log in.

2. **Client Integration**:
   - Installed the Supabase SDK: `npm install @supabase/supabase-js`.
   - Created `app/lib/supabaseClient.ts` to initialize the `createClient` with project URL and Anon Key.
>![env variables](./task-image/image_21.png)
Sensitive data such as Supabase credentials and GitHub tokens are managed via environment variables to ensure security.

3. **File Upload Implementation**:
   - Developed `uploadFile` function in `app/page.tsx`.
   - Used `supabase.storage.from('files').upload()` to handle file uploads.
   - Generated public URLs for uploaded files to be stored in the database.
   - **New Feature**: Added support for `.txt` file uploads in addition to `.pdf`, updating `Sidebar.tsx` accept attributes and backend handling logic.
>![Supabase storage](./task-image/image_22.png)

## Section 7: AI Summary for documents
**Requirements:**  
- **Note:** The detailed requirement will be discussed in week 4 lecture.
- Make regular commits to the repository and push the update to Github.
- Capture and paste the screenshots of your steps during development and how you test the app.
- The app should be mobile-friendly and have a responsive design.
- **Important:** You should securely handlle your API keys when pushing your code to GitHub and deploying your app to the production.
- When testing your app, try to explore some tricky and edge test cases that AI may miss. AI can help generate basic test cases, but it's the human expertise to  to think of the edge and tricky test cases that AI cannot be replace. 

Test the app in your local development environment, then deploy the app to Vercel and ensure all functionality works as expected in the deployed environment. 

***Github repository: https://github.com/ljackyliang-lab/ai-summary-app/tree/main/my-app***
***Vercel Deployment: https://my-eoomp9iod-ljackyliang-5760s-projects.vercel.app***

**Steps with major screenshots:**


>Git Commit History:
![Commit History](./task-image/image_23.png)



1. **UI Design with Tailwind CSS**:
   - Designed a modern, clean interface (white/gray/blue theme) avoiding the default "AI purple".
   - Split the application into `Sidebar` (file list) and `MainContent` (preview & summary) components.
   - Ensured responsiveness using Tailwind's flexbox and grid utilities.
   - **Styling Update**: Updated keyword chips to a subtle gray/neutral style for a more professional look.
>Website UI:
![Website UI](./task-image/image_9.png)

>File Delete Button:
![Delete Button](./task-image/image_13.png)


2. **Summary Display Structure**:
   - Created a dedicated section in `MainContent.tsx` to render Markdown-formatted summaries.
   - Defined TypeScript interfaces (`DocumentFile`) to handle summary status (`processing`, `ready`, `error`).
   - Added robust error handling for truncated or malformed JSON responses from the AI API.
>Summary AI:
![Website UI](./task-image/image_14.png)
![Summary Setting](./task-image/image_15.png)
With the summary setting we can change the language of the output and change the role settings of the output.

3. **AI Integration**:
   - Implemented `app/api/summarize/route.ts` using OpenAI SDK to connect with GitHub Models.
   - Configured system prompts to generate structured JSON output containing `summary` and `keywords`.
   - Added logic to handle both PDF parsing (using `pdf2json`) and direct text content (for `.txt` files).
>![Summary role code](./task-image/image_17.png)

4. **Mobile Friendly Interface**:
>Mobile Upload Interface:
![Mobile Interface](./task-image/image_24.png)
>Mobile Summary Interface:
![Mobile Interface](./task-image/image_25.png)
>Mobile Reader Interface:
![Mobile Interface](./task-image/image_26.png)
>Mobile File Note Interface:
![Mobile Interface](./task-image/image_27.png)

5. **Happy Path Test**:

   1. **Login**: Click "Test Login (Guest)" on the login page to enter the system immediately.
   2. **Upload**: Drag and drop a PDF or TXT file into the upload area in the sidebar, or click to select a file.
   3. **Processing**: Observe the "Generating..." status indicator in the file list and the "Analyzing content..." spinner in the summary panel.
   4. **Review Summary**: Once complete, verify that the Markdown-formatted summary appears on the right, and extracted keywords are displayed as gray chips at the bottom.
   5. **Interact**: Switch to the "Chat" tab and ask a question about the document to verify the QA functionality.
>**Login**:
![Test Step 1](./task-image/image_28.png)
![Test Step 2](./task-image/image_29.png)


**Upload**:
>![Test Step 1](./task-image/image_30.png)
![Test Step 2](./task-image/image_31.png)

**Processing**:
>![Processing](./task-image/image_32.png)

**Review Summary**:
>![Review Summary](./task-image/image_31.png)
![Gray chips](./task-image/image_33.png)

**Interact**:
>![Interact](./task-image/image_34.png)

## Section 8: Database Integration with Supabase  
**Requirements:**  
- Enhance the app to integrate with the Postgres database in Supabase to store the information about the documents and the AI generated summary.
- Make regular commits to the repository and push the update to Github.
- Capture and paste the screenshots of your steps during development and how you test the app.. Show a screenshot of the data stored in your Supabase Postgres Database.

Test the app in your local development environment, then deploy the app to Vercel and ensure all functionality works as expected in the deployed environment.

**Steps with major screenshots:**

1. **Database Schema Design**:
   - Created a `documents` table to store metadata: `id`, `name`, `type`, `url`, `summary`, `user_id`.
   - **Schema Update**: Added `user_notes` column to allow users to store personal annotations.
   - Created a `profiles` table to store user details: `id`, `username`, `full_name`.
>![Database table schema](./task-image/image_10.png)
In the database I will set up a separate profile table where the user id will be linked to documents, this will ensure that a user can save his/her own documents after log in.

2. **Backend Logic & Security**:
   - Enabled **Row Level Security (RLS)** on the `documents` table.
   - Added policies to ensure users can only `SELECT`, `INSERT`, `UPDATE` (for notes), and `DELETE` their own documents.
   - Implemented a PostgreSQL Trigger to automatically create a `profile` entry when a new user signs up.
>![Database policies](./task-image/image_20.png)
Policies are set in the database that define what permissions a logged in user has.

3. **Frontend Integration**:
   - Updated `app/page.tsx` to fetch the user's document list on load using `supabase.from('documents').select()`.
   - Linked storage uploads to database records: executing an `insert` operation immediately after a successful file upload.
   - Implemented real-time saving for `user_notes` directly to the database.
>![Database Note Column](./task-image/image_36.png)
>![Doc Note Function](./task-image/image_35.png)

## Section 9: Additional Features [OPTIONAL]
Implement at least one additional features that you think is useful that can better differentiate your app from others. Describe the feature that you have implemented and provide a screenshot of your app with the new feature.

**Feature 1: User Authentication & Account Isolation**

1. **Authentication System**:
   - Built a custom Login/Signup page (`app/login/page.tsx`) using Supabase Auth.
   - Implemented email/password authentication with an additional `username` field.
   - **Test Login**: Added a "Test Login (Guest)" button to facilitate quick testing without manual registration.
>![Login page](./task-image/image_28.png)

**Feature 2: Enhanced Note-Taking & Text Support**

1. **Rich Text Notes**:
   - Integrated `react-quill-new` for rich text editing of user notes.
   - Added functionality to "Import Summary" directly into notes for further editing.
>![Doc Note Function](./task-image/image_35.png)

2. **Text File Support**:
   - Extended the system to support `.txt` file uploads, processing them as direct text content instead of PDF parsing.
   - Updated UI to render text files directly in the preview pane.
>![Text File Preview](./task-image/image_37.png)
