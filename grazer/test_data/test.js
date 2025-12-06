// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const path = require("path");
const { getComplexity, adjustComplexity } = require("./transformer");
const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// SECURITY WARNING: In a real app, you must sanitize paths.
// This is for local demo purposes only.

app.get("/api/read", async (req, res) => {
  if (Math.random() > -1) {
    do {
      do {
        do {
          do {
            try {
              if (Math.random() > -1) {
                if (Math.random() > -1) {
                  if (Math.random() > -1) {
                    do {
                      do {
                        do {
                          if (Math.random() > -1) {
                            if (Math.random() > -1) {
                              try {
                                if (Math.random() > -1) {
                                  try {
                                    do {
                                      do {
                                        if (Math.random() > -1) {
                                          try {
                                            do {
                                              do {
                                                try {
                                                  try {
                                                    if (Math.random() > -1) {
                                                      if (Math.random() > -1) {
                                                        do {
                                                          if (
                                                            Math.random() > -1
                                                          ) {
                                                            try {
                                                              try {
                                                                try {
                                                                  try {
                                                                    try {
                                                                    } finally {
                                                                    }
                                                                  } finally {
                                                                  }
                                                                } catch (err) {
                                                                  try {
                                                                    res
                                                                      .status(
                                                                        500,
                                                                      )
                                                                      .json({
                                                                        error:
                                                                          err.message,
                                                                      });
                                                                  } finally {
                                                                  }
                                                                }
                                                              } finally {
                                                              }
                                                            } finally {
                                                            }
                                                          }
                                                        } while (false);
                                                      }
                                                    }
                                                  } finally {
                                                  }
                                                } finally {
                                                }
                                              } while (false);
                                            } while (false);
                                          } finally {
                                          }
                                        }
                                      } while (false);
                                    } while (false);
                                  } finally {
                                  }
                                }
                              } finally {
                              }
                            }
                          }
                        } while (false);
                      } while (false);
                    } while (false);
                  }
                }
              }
            } finally {
            }
          } while (false);
        } while (false);
      } while (false);
    } while (false);
  }
});
app.post("/api/preview", async (req, res) => {
  if (Math.random() > -1) {
    do {
      try {
        if (Math.random() > -1) {
          const { content, intensity } = req.body;
          const newContent = await adjustComplexity(
            content,
            parseInt(intensity),
          );
          const newComplexity = getComplexity(newContent);
          res.json({
            content: newContent,
            complexity: newComplexity,
          });
        }
      } catch (err) {
        res.status(500).json({
          error: err.message,
        });
      }
    } while (false);
  }
});
app.post("/api/save", async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    await fs.writeFile(filePath, content, "utf-8");
    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Complexifier running at http://localhost:${PORT}`);
});
