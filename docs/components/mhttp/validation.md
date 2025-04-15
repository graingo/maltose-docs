# 请求验证

Maltose 框架内置了强大的请求验证功能，基于 Go 生态系统中流行的 validator 库，使开发者能够轻松验证请求参数并提供友好的错误消息。

## 基础验证

使用结构体标签定义验证规则：

```go
type RegisterReq struct {
    m.Meta   `path:"/register" method:"POST"`
    Username string `json:"username" binding:"required,min=4,max=20"`
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
    Age      int    `json:"age" binding:"required,gte=18"`
}
```

当请求无法通过验证时，Maltose 会自动返回验证错误：

```json
{
  "code": 400,
  "message": "用户名长度必须至少为4个字符",
  "data": null
}
```

## 常用验证规则

Maltose 支持以下常用验证规则：

| 规则     | 描述                       | 示例                               |
| -------- | -------------------------- | ---------------------------------- |
| required | 必填字段                   | `binding:"required"`               |
| min      | 最小值（字符串长度或数字） | `binding:"min=4"`                  |
| max      | 最大值（字符串长度或数字） | `binding:"max=20"`                 |
| len      | 精确长度（字符串或数组）   | `binding:"len=6"`                  |
| eq       | 等于特定值                 | `binding:"eq=100"`                 |
| ne       | 不等于特定值               | `binding:"ne=0"`                   |
| gt       | 大于特定值                 | `binding:"gt=0"`                   |
| gte      | 大于等于特定值             | `binding:"gte=18"`                 |
| lt       | 小于特定值                 | `binding:"lt=100"`                 |
| lte      | 小于等于特定值             | `binding:"lte=100"`                |
| email    | 电子邮件格式               | `binding:"email"`                  |
| url      | URL 格式                   | `binding:"url"`                    |
| uri      | URI 格式                   | `binding:"uri"`                    |
| alpha    | 只包含字母                 | `binding:"alpha"`                  |
| alphanum | 只包含字母和数字           | `binding:"alphanum"`               |
| numeric  | 数字格式                   | `binding:"numeric"`                |
| uuid     | UUID 格式                  | `binding:"uuid"`                   |
| file     | 文件格式                   | `binding:"file"`                   |
| oneof    | 枚举值之一                 | `binding:"oneof=admin user guest"` |
| dive     | 用于验证切片或映射的元素   | `binding:"dive,required,min=1"`    |

## 复合验证规则

多个验证规则可以组合使用：

```go
type ProductReq struct {
    m.Meta    `path:"/products" method:"POST"`
    Name      string   `json:"name" binding:"required,min=2,max=50"`
    Price     float64  `json:"price" binding:"required,gt=0"`
    Category  string   `json:"category" binding:"required,oneof=electronics clothing food"`
    Tags      []string `json:"tags" binding:"dive,required,min=2"`
    Inventory *int     `json:"inventory" binding:"required,gte=0"`
}
```

## 自定义验证规则

Maltose 允许您注册自定义验证规则：

```go
import (
    "regexp"
    "github.com/go-playground/validator/v10"
    "github.com/graingo/maltose/net/mhttp"
)

func init() {
    // 注册自定义验证规则
    mhttp.RegisterRuleWithTranslation("mobile", ValidateMobile, map[string]string{
        "zh": "{0}必须是有效的手机号码",
        "en": "{0} must be a valid mobile number",
    })

    mhttp.RegisterRuleWithTranslation("chinese_name", ValidateChineseName, map[string]string{
        "zh": "{0}必须是有效的中文姓名",
        "en": "{0} must be a valid Chinese name",
    })
}

// 验证手机号的规则
func ValidateMobile(fl validator.FieldLevel) bool {
    mobile := fl.Field().String()
    pattern := `^1[3-9]\d{9}$`
    matched, _ := regexp.MatchString(pattern, mobile)
    return matched
}

// 验证中文姓名的规则
func ValidateChineseName(fl validator.FieldLevel) bool {
    name := fl.Field().String()
    if len(name) < 2 || len(name) > 20 {
        return false
    }
    pattern := `^[\p{Han}·]+$`
    matched, _ := regexp.MatchString(pattern, name)
    return matched
}

// 使用自定义验证规则
type UserReq struct {
    m.Meta    `path:"/users" method:"POST"`
    Mobile    string `json:"mobile" binding:"required,mobile"`
    Name      string `json:"name" binding:"required,chinese_name"`
}
```

## 条件验证

有时我们需要基于某个字段的值来决定是否验证另一个字段，这可以通过 `required_if`、`required_unless` 等标签实现：

```go
type PaymentReq struct {
    m.Meta       `path:"/payment" method:"POST"`
    PaymentType  string `json:"payment_type" binding:"required,oneof=credit_card bank_transfer"`

    // 当 PaymentType 为 credit_card 时，这些字段必填
    CardNumber   string `json:"card_number" binding:"required_if=PaymentType credit_card,omitempty,numeric"`
    ExpiryMonth  int    `json:"expiry_month" binding:"required_if=PaymentType credit_card,omitempty,min=1,max=12"`
    ExpiryYear   int    `json:"expiry_year" binding:"required_if=PaymentType credit_card,omitempty,min=2023"`
    CVV          string `json:"cvv" binding:"required_if=PaymentType credit_card,omitempty,len=3,numeric"`

    // 当 PaymentType 为 bank_transfer 时，这些字段必填
    BankName     string `json:"bank_name" binding:"required_if=PaymentType bank_transfer"`
    AccountName  string `json:"account_name" binding:"required_if=PaymentType bank_transfer"`
    AccountNumber string `json:"account_number" binding:"required_if=PaymentType bank_transfer"`
}
```

## 验证结构体字段

对于嵌套结构体的验证：

```go
type Address struct {
    Street  string `json:"street" binding:"required"`
    City    string `json:"city" binding:"required"`
    State   string `json:"state" binding:"required"`
    ZipCode string `json:"zip_code" binding:"required,numeric,len=5"`
    Country string `json:"country" binding:"required"`
}

type CreateUserReq struct {
    m.Meta   `path:"/users" method:"POST"`
    Name     string  `json:"name" binding:"required"`
    Email    string  `json:"email" binding:"required,email"`
    Address  Address `json:"address" binding:"required"` // 验证嵌套结构体
}
```

## 验证切片和映射

对于切片和映射类型的验证，可以使用 `dive` 标签：

```go
type BulkCreateReq struct {
    m.Meta `path:"/bulk-create" method:"POST"`

    // 验证用户数组中的每个元素
    Users []struct {
        Name  string `json:"name" binding:"required"`
        Email string `json:"email" binding:"required,email"`
    } `json:"users" binding:"required,dive"` // dive 表示继续验证每个元素

    // 验证映射中的所有值
    Metadata map[string]string `json:"metadata" binding:"dive,required,min=1"`
}
```

## 验证错误处理

Maltose 自动处理验证错误并返回标准响应，但您也可以自定义错误处理逻辑：

```go
import "github.com/go-playground/validator/v10"

func customErrorHandler(r *mhttp.Request, err error) {
    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        // 获取翻译器
        trans := r.GetTranslator()

        // 翻译错误消息
        errorMessages := make([]string, 0, len(validationErrors))
        for _, e := range validationErrors.Translate(trans) {
            errorMessages = append(errorMessages, e)
        }

        // 返回自定义错误响应
        r.JSON(400, map[string]interface{}{
            "code": 400,
            "message": "Validation failed",
            "errors": errorMessages,
        })
        r.Abort()
        return
    }

    // 处理其他类型的错误
    r.Next()
}
```

## 注意事项

- 避免过于复杂的验证规则，可能会影响性能
- 考虑将复杂的业务验证逻辑放在服务层，而不是全部依赖标签验证
- 验证错误消息默认为英文，使用翻译器提供本地化支持
- 敏感数据验证失败时，注意不要在错误消息中暴露敏感信息
