# coding=utf-8
#!/usr/bin/python3

def main():
    title = input("新文章文档序号:")
    val = 0
    try:
        val = int(title)
    except ValueError:
        print("That's not an int!")
        return

    if val > 99:
        print("需要修改template.md， 修改完成后这个判断就可以删掉了")
        return

    all = ""
    with open("./posts/template.md", "r+") as f:
        data = f.read()
        all = data.replace('NNN', str(val))

    filename_prefix = "./posts/"

    if val < 100:
        filename_prefix = filename_prefix + "0"
    else:
        print("如果val大于100 这个判断就可以删掉了")

    filename = filename_prefix + str(val) + ".md"

    with open(filename, "w") as f:
        f.write(all)

if __name__ == "__main__":
    
    main()

