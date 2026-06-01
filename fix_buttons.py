import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple replace
    new_content = content.replace('<button className="cursor-pointer"', '<button')
    new_content = new_content.replace('<Button className="cursor-pointer"', '<Button')
    
    # Also handle some single line cases if any
    new_content = new_content.replace('<button className="cursor-pointer" ', '<button ')
    new_content = new_content.replace('<Button className="cursor-pointer" ', '<Button ')

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

def main():
    frontend_dir = os.path.join("frontend", "src")
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith((".jsx", ".js", ".tsx", ".ts")):
                fix_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
