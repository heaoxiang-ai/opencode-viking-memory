import requests
import json 

from volcengine.auth.SignerV4 import SignerV4
from volcengine.Credentials import Credentials
from volcengine.base.Request import Request

AK = ""
SK = ""
URL = "api-knowledgebase.mlp.cn-beijing.volces.com"

def prepare_request(method, path, ak, sk, data=None):
  r = Request()
  r.set_shema("http")
  r.set_method(method)
  r.set_host(URL)
  r.set_path(path)
  
  if data is not None:
    r.set_body(json.dumps(data))
  credentials = Credentials(ak, sk, 'air', 'cn-north-1')
  SignerV4.sign(r, credentials)
  return r

def internal_request(method, api, payload, params=None):
  
  req = prepare_request(
                        method = method, 
                        path = api,
                        ak = AK, 
                        sk = SK,
                        data = payload)
  
  r = requests.request(method=req.method,
          url="{}://{}{}".format(req.schema, req.host, req.path),
          headers=req.headers,
          data=req.body,
          params=params,
      )
  return r


def create():
    vibe_coding_event_schema = {
        "EventType": "sys_event_vibe_coding_v1",
        "Version": "1",
        "Description": """
    指导原则：
    （1）总结需包含核心技术上下文，注重细节，尤其强调代码变更决策、技术栈选择、遇到的Bug及最终解决方案（例如：用户曾尝试使用 “React Context” 管理状态，但因性能问题改用 “Zustand”），不得遗漏。
    （2）记录用户的编程偏好与习惯，包括命名风格、喜欢的库/框架、对代码整洁度的要求（如：用户倾向于使用函数式编程，不喜欢过深的嵌套）。
    （3）将对话转换为技术文档风格的间接引语，记录用户的开发意图、当前遇到的阻碍以及Assistant提供的关键代码片段或架构建议。
    （4）创作连贯的技术叙述，保留关键的逻辑推演过程。
    （5）使用第三人称视角。
    （6）如果可以的话，结合当前代码上下文，推测用户下一步的开发计划或可能遇到的潜在风险。
    （7）尽可能在一个事件内描述完整的功能模块开发或Bug修复过程，不要拆分。
    """,
        "Properties": [
            {
                "PropertyName": "summary",
                "PropertyValueType": "string",
                "Description": "基于上述字段内容，编写一段描述以概述完整的技术实现或问题解决过程。",
            },
        ]
    }
    vibe_coding_profile_schema = {
        "ProfileType": "sys_profile_vibe_coding_v1",
        "Version": "1",
        "Description": """
    完整的开发者用户画像。请记住，您应该使用与用户输入相同的语言来记录画像信息。
        """,
        "Role": "user",
        "Properties": [
            {
                "PropertyName": "user_profile",
                "PropertyValueType": "string",
                "Description": """
                你是一个资深技术专家助手，擅长通过和用户的「代码协作记录」与「技术讨论」分析、提炼「开发者画像」特征，执行动态画像建模，提取用户的技术栈偏好、编码习惯以及协作风格。请记住,你应该用与用户输入相同的语言记录该画像。

                ## 任务定义
                根据用户的「历史编码记录」和「技术对话」，动态建模开发者画像与增量更新，生成结构化技术特征图谱，包括用户的基本技术背景、对不同技术栈的掌握/喜好程度，以及推测其编码风格和协作偏好。

                ## 任务核心
                ### 重要提醒
                1.【非常非常重要】画像抽取的字段仅允许在以下的字段白名单维度，禁止生成任何其他字段!!!如在 「基础信息」抽取出「发量」这个属性是需要被避免的!!)。并且抽取的字段应该归属于正确的分类下(基础信息或技术栈偏好)，如「常用IDE」是「基础信息」内的字段，千万千万不要把它抽取到「技术栈偏好」中！！！
                2. 禁止在基础信息包含非白名单字段
                3. 没有内容的字段不应该出现

                ### 画像合并提醒
                对于任务的不同阶段，你可能需要将当前画像和历史版本画像进行合并，来生成新的画像
                1. 执行多版本画像融合：
                    a. 【非常非常重要】 对画像各个子字段中相似重叠的内容进行去重和总结处理。例如，对于像“React”“React.js”“React框架”这类相近内容，总结为“React”。字段的极性程度应以最新的画像中的程度作为标准。
                    b. 对于深入或相近的内容，直接在原有基础上进行更新。
                    c. 仔细判断矛盾的内容，确定是保留还是更新（例如用户以前喜欢 Java，现在明确表示讨厌 Java，应更新极性为负）。
                2. 【非常重要，不要忘记】对于新提取到的画像和现有用户画像中，不在画像架构中的「基础信息」字段进行删除；对于语义相近且可归类到画像架构中某个字段的内容，进行转化归类。

                ### 任务流程
                请按照以下任务流程完成工作：
                1. 通过代码片段和技术问题收集用户的基本信息（如主要语言、开发环境、角色等），为精准技术支持做准备。
                2. 根据对话内容，记录用户的技术栈偏好（如喜欢的库、讨厌的框架、常用的工具），提供符合其口味的技术方案。
                3. 分析用户的编码习惯与风格，判断其协作偏好（偏好简洁代码、重视注释、喜欢函数式编程等）。

                ## 画像内容
                ### 字段定义
                #### 基础信息
                - 昵称: 用户希望被称呼的名字
                - 角色: 用户在团队中的角色，如前端、后端、全栈、架构师、学生。
                - 工作年限: 用户的开发经验年限（推测或自述）。
                - 常用IDE: 用户偏好的集成开发环境，如 VS Code, IntelliJ IDEA, Vim。
                - 操作系统: 用户使用的操作系统，如 macOS, Windows, Linux。
                - 英语能力: 阅读英文文档或变量命名的能力。
                - 所在行业: 用户从事的业务领域，如电商、金融、游戏、AI。

                #### 技术栈偏好
                - 编程语言: 掌握或使用的语言，如 Python, TypeScript, Rust, Go。
                - 前端框架: 如 React, Vue, Svelte, TailwindCSS。
                - 后端框架: 如 Spring Boot, Django, NestJS, Express。
                - 数据库: 如 MySQL, PostgreSQL, MongoDB, Redis。
                - 运维/云原生: 如 Docker, Kubernetes, AWS, Vercel。
                - 测试工具: 如 Jest, Cypress, JUnit。
                - 构建工具: 如 Webpack, Vite, Maven, Gradle。
                - AI/LLM: 涉及的大模型技术，如 OpenAI API, LangChain, HuggingFace。
                - 常用库: 其他高频使用的第三方库，如 Lodash, Pandas, NumPy。

                #### 编码习惯与风格
                - 代码风格: 缩进习惯、命名规范（驼峰/下划线）、是否喜欢分号等。
                - 编程范式: 偏好函数式编程 (FP)、面向对象 (OOP) 或 响应式编程。
                - 注释习惯: 是否喜欢写注释，注释的详细程度。
                - 错误处理: 偏好的异常处理方式，如 try-catch, Result类型, 忽略错误。
                - 协作偏好: 喜欢直接给代码片段、还是先讲原理再给代码、是否需要详细解释。
                - 性能关注: 对性能优化的重视程度，如时间复杂度、内存占用。
                - 安全意识: 对代码安全性的关注，如防注入、鉴权。
                - 学习风格: 喜欢看官方文档、喜欢看示例代码、还是喜欢看视频教程。

                在生成技术栈偏好、编码习惯与风格画像时, 带上极性符号，用于表述掌握程度或喜爱程度，最多三个：
                    - [+]掌握/喜欢(1 - 3个+表强度)
                    - [-]未掌握/讨厌(1 - 3个-表强度)

                你需要输出结构化的用户特征图谱。
                "{
                    "基础信息": {
                        "分类1": "描述1",
                        "分类2": "描述2"
                    },
                    "技术栈偏好": {
                        "分类1": ["[极性]技术点1"],
                        "分类2": ["[极性]技术点2"]
                    },
                    "编码习惯与风格": {
                        "分类1": ["[极性]习惯点1"],
                        "分类2": ["[极性]习惯点2"]
                    }
                }"

                ## 示例
                ### 示例输出
                1.输出正确示例
                "{
                    "基础信息": {
                        "昵称": "阿强",
                        "角色": "全栈工程师",
                        "常用IDE": "VS Code"
                    },
                    "技术栈偏好": {
                        "编程语言": ["[-]Java", "[++]TypeScript", "[+]Rust"],
                        "前端框架": ["[++]React", "[-]Vue2"],
                        "运维/云原生": ["[+]Docker"],
                    },
                    "编码习惯与风格":{
                        "协作偏好": ["[++]直接给完整可运行的代码块", "[-]解释太多理论"],
                        "代码风格": ["[+]使用ES6+语法", "[-]分号"]
                    }
                }"

                ### 错误输出(需要避免，不应该出现类似输出):
                "{
                    "基础信息": {
                        "昵称": "小林",
                        "角色": "后端",
                        "喜欢的电影": "黑客帝国"  // 非法字段，属于兴趣偏好但不在白名单
                    },
                    "技术栈偏好": {
                        "编程语言": ["想学Go"]  // 缺少极性符号
                        "IDE": ["[+]VS Code"]  // IDE属于基础信息, 错误分类
                    },
                    "编码习惯与风格":{
                        "学习风格": [], //出现了没有内容的字段
                    }
                }"
                """,
            },
        ]
    }
    
    payload = {
    "Description": "vibe_coding",
    "ProjectName": "default",
    "CollectionName": "vibe_coding",
    'CustomEventTypeSchemas': [vibe_coding_event_schema],
    'CustomProfileTypeSchemas': [vibe_coding_profile_schema],
    }

    path = '/api/memory/collection/create'
    rsp = internal_request('POST', path, payload)
    print(rsp.json())
    
def main():
    create()
    
main()