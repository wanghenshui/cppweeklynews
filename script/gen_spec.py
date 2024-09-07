# coding=utf-8
#!/usr/bin/python3
import time
def main():
    title = input("新文章名字 不要有空格:")


    all = ""
    with open("./spec/template.md", "r+",errors="ignore") as f:
        data = f.read()
        all = data.replace("%Y-%m-%d", time.strftime("%Y-%m-%d"))

    filename_prefix = "./spec/"

    filename = filename_prefix + time.strftime("%Y-%m-%d") + '-'+ title + ".md"

    with open(filename, "w") as f:
        f.write(all)

if __name__ == "__main__":
    
    main()