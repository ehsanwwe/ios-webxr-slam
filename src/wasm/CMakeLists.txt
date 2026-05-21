cmake_minimum_required(VERSION 3.20)
project(webarkit_cv LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Phase 3 will wire up Emscripten targets here.
# add_executable(webarkit_cv
#   src/fast_corners.cpp
#   src/lk_tracker.cpp
#   src/homography.cpp
#   src/bindings.cpp
# )
