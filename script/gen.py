# coding=utf-8
#!/usr/bin/python3
import time
def main():
    title = input("新文章文档序号:")
    val = 0
    try:
        val = int(title)
    except ValueError:
        print("That's not an int!")
        return

    all = ""
    with open("./posts/template.md", "r+",errors="ignore") as f:
        data = f.read()
        all = data.replace('NNN', str(val))
        all = all.replace('MMM', str(val-1))
        all = all.replace("%Y-%m-%d", time.strftime("%Y-%m-%d"))

    filename_prefix = "./posts/"

    filename = filename_prefix + str(val) + ".md"

    with open(filename, "w") as f:
        f.write(all)

if __name__ == "__main__":
    
    main()