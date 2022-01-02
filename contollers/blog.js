const Blog = require("../models/blog");
const User = require("../models/user");
const Category = require("../models/category");
const Tag = require("../models/tag");
const formidable = require("formidable");
const slugify = require("slugify");
// const stripHtml = require("string-strip-html");
const _ = require("lodash");
const { errorHandler } = require("../helpers/dbErrorHandler");
const fs = require("fs");
const { smartTrim } = require("../helpers/blog");

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log(err);
      return res.status(400).json({
        error: "Image could not upload",
      });
    }

    const { title, body, categories, tags } = fields;

    if (!title || !title.length) {
      return res.status(400).json({
        error: "title is required",
      });
    }

    if (!body || body.length < 50) {
      return res.status(409).json({
        error: "Content is too short",
      });
    }

    if (!categories || categories.length === 0) {
      return res.status(400).json({
        error: "At least one category is required",
      });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({
        error: "At least one tag is required",
      });
    }

    let blog = new Blog();
    blog.title = title;
    blog.body = body;
    blog.excerpt = smartTrim(body, 320, " ", " ...");
    blog.slug = slugify(title).toLowerCase();
    blog.mtitle = `${title} | ${process.env.APP_NAME}`;
    // blog.mdesc = stripHtml(body.substring(0, 160));
    blog.postedBy = req.user._id;
    // categories and tags
    let arrayOfCategories = categories && categories.split(",");
    let arrayOfTags = tags && tags.split(",");

    if (files.photo) {
      if (files.photo.size > 10000000) {
        return res.status(400).json({
          error: "Image should be less then 1mb in size",
        });
      }

      blog.photo.data = fs.readFileSync(files.photo.filepath);
      blog.photo.contentType = files.photo.type;
    }

    blog.save((err, result) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      // res.json(result);
      Blog.findByIdAndUpdate(
        result._id,
        { $push: { categories: arrayOfCategories } },
        { new: true }
      ).exec((err, result) => {
        if (err) {
          console.log(err);
          return res.status(400).json({
            error: errorHandler(err),
          });
        } else {
          Blog.findByIdAndUpdate(
            result._id,
            { $push: { tags: arrayOfTags } },
            { new: true }
          ).exec((err, result) => {
            console.log(err);
            if (err) {
              return res.status(400).json({
                error: errorHandler(err),
              });
            } else {
              res.json(result);
            }
          });
        }
      });
    });
  });
};

exports.list = (req, res) => {
  Blog.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    .select(
      "_id title slug excerpt categories tags postedBy createdAt updateAt"
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err),
        });
      }

      res.json(data);
    });
};
exports.listAllBlogsCategoriesTags = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  let blogs;
  let categories;
  let tags;

  Blog.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      "_id title slug excerpt categories tags postedBy createdAt updatedAt"
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err),
        });
      }

      blogs = data;

      Category.find({}).exec((err, c) => {
        if (err) {
          return res.json({
            error: errorHandler(err),
          });
        }

        categories = c;

        Tag.find({}).exec((err, t) => {
          if (err) {
            return res.json({
              error: errorHandler(err),
            });
          }

          tags = t;

          res.json({
            blogs,
            categories,
            tags,
            size: blogs.length,
          });
        });
      });
    });
};
exports.read = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOne({ slug })
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    .select(
      "_id title body slug mtitle mdesc categories tags postedBy createdAt updatedAt"
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err),
        });
      }

      res.json(data);
    });
};
exports.remove = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOneAndRemove({ slug }).exec((err, data) => {
    if (err) {
      return res.json({
        error: errorHandler(err),
      });
    }

    res.json({
      message: "Blog deleted successfully",
    });
  });
};

exports.update = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOne({ slug: slug }).exec((err, oldBlog) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }

    let form = new formidable.IncomingForm();
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          error: "Image could not upload",
        });
      }

      // const { title, body, categories, tags } = fields;
      // console.log(title, body, categories, tags);

      let slugBeforMerge = oldBlog.slug;
      oldBlog = _.merge(oldBlog, fields);
      oldBlog.slug = slugBeforMerge;

      const { body, desc, categories, tags } = fields;
      // console.log(body);

      if (body) {
        oldBlog.excerpt = smartTrim(body, 320, " ", " ...");
        oldBlog.mdesc = body.substring(0, 160);
        oldBlog.body = body;
        // console.log(oldBlog);
      }

      if (categories) {
        oldBlog.categories = categories.split(",");
      }
      if (tags) {
        oldBlog.tags = tags.split(",");
      }

      if (files.photo) {
        if (files.photo.size > 10000000) {
          return res.status(400).json({
            error: "Image should be less then 1mb in size",
          });
        }

        oldBlog.photo.data = fs.readFileSync(files.photo.filepath);
        oldBlog.photo.contentType = files.photo.type;
      }
      // console.log(oldBlog);
      oldBlog.save((err, result) => {
        // console.log(result);
        if (err) {
          console.log(err);
          return res.status(400).json({
            error: errorHandler(err),
          });
        }
        result.photo = undefined;
        // console.log(result);s

        res.json(result);
      });
    });
  });
  // let form = new formidable.IncomingForm();
};

exports.photo = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug })
    .select("photo")
    .exec((err, blog) => {
      if (err || !blog) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }

      res.set("Content-Type", blog.photo.contentType);
      return res.send(blog.photo.data);
    });
};

exports.listRelated = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 3;

  const { _id, categories } = req.body.data;

  // console.log(_id, categories);

  Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
    .limit(limit)
    .populate("postedBy", "_id name profile username")
    .select("title slug excerpt postedBy createdAt updatedAt ")
    .exec((err, blogs) => {
      if (err) {
        return res.status(400).json({
          error: "Blogs not found",
        });
      }
      // console.log(blogs);
      res.json(blogs);
    });
};

exports.listSearch = (req, res) => {
  // console.log(req.query);
  const { search } = req.query;

  if (search) {
    Blog.find(
      {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { body: { $regex: search, $options: "i" } },
        ],
      },
      (err, blogs) => {
        // console.log(blogs);
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }

        res.json(blogs);
      }
    ).select("-photo -body");
  }
};

exports.listByUser = (req, res) => {
  User.findOne({ username: req.params.username }).exec((err, user) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }

    let userId = user._id;

    Blog.find({ postedBy: userId })
      .populate("categories", "_id name slug")
      .populate("tags", "_id name slug")
      .populate("postedBy", "_id name username")
      .select("_id title slug postedBy createdBy updatedBy")
      .exec((err, data) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        }

        res.json(data);
      });
  });
};
// const Blog = require("../models/blog");
// const Category = require("../models/category");
// const Tag = require("../models/tag");
// const formidable = require("formidable");
// const slugify = require("slugify");
// // const stripHtml = require("string-strip-html");
// // const { stripHtml } = import("string-strip-html");
// // const { strict } = require("assert");
// // const { stripHtml } = import("string-strip-html");

// const _ = require("lodash");
// const { errorHandler } = require("../helpers/dbErrorHandler");
// const fs = require("fs");
// const { smartTrim } = require("../helpers/blog");

// exports.create = (req, res) => {
//   let form = new formidable.IncomingForm();

//   form.keepExtensions = true;
//   form.parse(req, async (err, fields, files) => {
//     if (err) {
//       return res.status(400).json({
//         error: "Image could not upload",
//       });
//     }
//     const { title, body, categories, tags } = fields;
//     console.log(title, body, categories, tags);

//     // if (!title || !title.length) {
//     if (!title) {
//       return res.status(400).json({
//         error: "title is required",
//       });
//     }
//     // if (!body || body.length < 10) {
//     if (!body) {
//       return res.status(400).json({
//         error: "Content is too short",
//       });
//     }
//     // if (!categories || categories.length == 0) {
//     if (!categories) {
//       return res.status(400).json({
//         error: "At least one Category is required",
//       });
//     }
//     // if (!tags || tags.length == 0) {
//     if (!tags) {
//       return res.status(400).json({
//         error: "At least one Tag is required",
//       });
//     }

//     let arrayOfCategories = categories && categories.split(",");
//     let arrayOfTags = tags && tags.split(",");
//     let blog = new Blog();

//     blog.title = title;
//     blog.body = body;
//     blog.excerpt = smartTrim(body, 320, " ", "...");
//     blog.slug = slugify(title).toLowerCase();
//     blog.mtitle = `${title} | ${process.env.APP_NAME}`;
//     blog.mdesc = body.substring(0, 160);
//     blog.categories = arrayOfCategories;
//     blog.tags = arrayOfTags;
//     // blog.mdesc = stripHtml(body.substring(0, 160));
//     blog.postedBy = req.user._id;

//     //categories and tags

//     // console.log(categories, tags);

//     // console.log(arrayOfTags, arrayOfCategories);

//     if (files.photo) {
//       if (files.photo.size > 10000000) {
//         return res.status(400).json({
//           error: "Image should be less than 1mb in size",
//         });
//       }

//       blog.photo.data = fs.readFileSync(files.photo.filepath);
//       blog.photo.contentType = files.photo.type;
//     }

//     blog.save((err, result) => {
//       if (err) {
//         return res.status(400).json({
//           error: errorHandler(err),
//         });
//       }

//       return res.status(200).json(result);
//       // res.json(result);
//       // Blog.findByIdAndUpdate(
//       //   result._id,
//       //   { $push: { categories: arrayOfCategories } },
//       //   { new: true }
//       //   if (err) {
//       //     return res.status(400).json({
//       //       error: errorHandler(err),
//       //     });
//       //   } else {
//       //     Blog.findByIdAndUpdate(
//       //       result._id,
//       //       { $push: { tags: arrayOfTags } },
//       //       { new: true }
//       //     ).exec((err, result) => {
//       //       if (err) {
//       //         return res.status(400).json({
//       //           error: errorHandler(err),
//       //         });
//       //       } else {
//       //         res.json(result);
//       //       }
//       //     });
//       //   }
//       // });
//     });
//   });
// };
