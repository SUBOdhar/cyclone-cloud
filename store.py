import requests
import argparse
import json
import sys
import getpass # For securely getting password input

def update_app(server_url, app_name, app_version, local_file_path, app_password):
    """
    Sends a POST request to the server to add or update app information,
    including uploading the app file.

    Args:
        server_url (str): The base URL of your Express server (e.g., "http://localhost:3000").
        app_name (str): The name of the application.
        app_version (str): The version of the application.
        local_file_path (str): The local path to the application's update file.
        app_password (str): The password for adding/updating the app.
    """
    push_endpoint = f"{server_url}/push"
    
    # Data fields to send along with the file (these will be regular form fields)
    data_fields = {
        "appName": app_name,
        "version": app_version,
        "password": app_password
    }

    print(f"Attempting to push update for app: {app_name} (Version: {app_version})")
    print(f"Target URL: {push_endpoint}")
    print(f"Local file to upload: {local_file_path}")

    try:
        # Open the file in binary read mode
        with open(local_file_path, 'rb') as f:
            # 'updateFile' is the name of the form field on the server side that will receive the file.
            # (filename, file_object, content_type)
            files = {'updateFile': (f'{app_name}.apk', f, 'application/octet-stream')}

            # Send the POST request with both data fields and the file
            response = requests.post(push_endpoint, data=data_fields, files=files)
            response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)

            response_json = response.json()
            print("\nServer Response:")
            print(json.dumps(response_json, indent=2))

            if response.status_code == 200:
                print(f"\nSUCCESS: App '{app_name}' updated/added successfully.")
            else:
                print(f"\nERROR: Server responded with status {response.status_code}.")
                if 'error' in response_json:
                    print(f"Details: {response_json['error']}")

    except FileNotFoundError:
        print(f"\nERROR: The specified file '{local_file_path}' was not found.")
        sys.exit(1) # Exit the script if the file isn't found
    except requests.exceptions.HTTPError as http_err:
        print(f"\nHTTP error occurred: {http_err}")
        try:
            error_json = http_err.response.json()
            print("Server error details:")
            print(json.dumps(error_json, indent=2))
        except json.JSONDecodeError:
            print("Server returned non-JSON error response.")
            print(http_err.response.text)
    except requests.exceptions.ConnectionError as conn_err:
        print(f"\nConnection error occurred: {conn_err}")
        print("Please ensure the server is running and the URL is correct.")
    except requests.exceptions.Timeout as timeout_err:
        print(f"\nTimeout error occurred: {timeout_err}")
        print("The request timed out. The server might be slow or unresponsive.")
    except requests.exceptions.RequestException as req_err:
        print(f"\nAn unexpected request error occurred: {req_err}")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Add or update an app's version information on the server. "
                    "Prompts for missing arguments if not provided."
    )
    parser.add_argument(
        "--server-url",
        type=str,
        default="https://apps.subodh0.com.np", # Default server URL, change if yours is different
        help="The base URL of your Express server (e.g., http://localhost:3000)"
    )
    parser.add_argument(
        "--app-name",
        type=str,
        help="The name of the application (e.g., 'myApp')"
    )
    parser.add_argument(
        "--app-version",
        type=str,
        help="The version of the application (e.g., '1.0.1')"
    )
    parser.add_argument(
        "--local-file-path", # Renamed argument to reflect it's a local path for upload
        type=str,
        help="The local path to the application's update file (e.g., './builds/myApp-1.0.1.apk')"
    )
    parser.add_argument(
        "--app-password",
        type=str,
        help="The password for adding/updating the app"
    )

    args = parser.parse_args()

    # Interactive input if arguments are missing
    if not args.app_name:
        args.app_name = input("Enter app name: ")
    if not args.app_version:
        args.app_version = input(f"Enter version for {args.app_name}: ")
    if not args.local_file_path:
        args.local_file_path = input(f"Enter local file path for {args.app_name} to upload: ")
    if not args.app_password:
        while True:
            args.app_password = getpass.getpass(f"Enter password for {args.app_name}: ")
            confirm_password = getpass.getpass(f"Confirm password for {args.app_name}: ")
            if args.app_password == confirm_password:
                break
            else:
                print("Passwords do not match. Please try again.")

    # Call the update function with the parsed or interactively provided arguments
    update_app(
        args.server_url,
        args.app_name,
        args.app_version,
        args.local_file_path,
        args.app_password
    )
